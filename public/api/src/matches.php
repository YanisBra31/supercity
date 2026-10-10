<?php
// Matchs : création, recherche autour de soi, inscription avec liste d'attente, annulation.
declare(strict_types=1);

// Places par défaut selon le format (modifiables à la création).
const DEFAULT_PLAYERS = ['city5' => 10, 'futsal' => 10, 'foot8' => 16, 'foot11' => 22];

function load_match(int $id, bool $lock = false): array
{
    return one('SELECT * FROM matches WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), [$id]) ?? not_found('Match');
}

function registered_count(int $matchId): int
{
    return (int)one('SELECT COUNT(*) AS n FROM match_participants WHERE match_id = ? AND status = "registered"', [$matchId])['n'];
}

/** Statut affiché : « played » une fois le match terminé, sinon le statut stocké. */
function match_status(array $m): string
{
    if ($m['status'] !== 'cancelled') {
        $end = strtotime($m['starts_at'] . ' UTC') + 60 * (int)$m['duration_min'];
        if ($end < time()) {
            return 'played';
        }
    }
    return $m['status'];
}

/** Recalcule open/full après un changement d'inscriptions ou de places, et fait monter la liste d'attente. */
function refresh_match(int $matchId): void
{
    $m = load_match($matchId, true);
    if ($m['status'] === 'cancelled') {
        return;
    }
    $free = (int)$m['max_players'] - registered_count($matchId);
    if ($free > 0) {
        query(
            'UPDATE match_participants SET status = "registered" WHERE match_id = ? AND status = "waitlist"
             ORDER BY updated_at, created_at LIMIT ' . $free,
            [$matchId]
        );
    }
    $status = registered_count($matchId) >= (int)$m['max_players'] ? 'full' : 'open';
    query('UPDATE matches SET status = ? WHERE id = ?', [$status, $matchId]);
}

function match_view(array $m, ?int $viewerId, bool $withPlayers = false): array
{
    $id = (int)$m['id'];
    $venue = one('SELECT * FROM venues WHERE id = ?', [$m['venue_id']]);
    if (isset($m['distance_km'])) {
        $venue['distance_km'] = $m['distance_km'];
    }
    $counts = query(
        'SELECT status, COUNT(*) AS n FROM match_participants WHERE match_id = ? GROUP BY status',
        [$id]
    )->fetchAll(PDO::FETCH_KEY_PAIR);
    $registered = (int)($counts['registered'] ?? 0);
    $mine = $viewerId ? one('SELECT status, team_id FROM match_participants WHERE match_id = ? AND user_id = ?', [$id, $viewerId]) : null;
    $team = fn($tid) => $tid ? (($t = one('SELECT id, name, logo_url FROM teams WHERE id = ?', [$tid])) ? ['id' => (int)$t['id'], 'name' => $t['name'], 'logo_url' => $t['logo_url']] : null) : null;
    $organizer = one('SELECT * FROM users WHERE id = ?', [$m['organizer_id']]);

    $out = [
        'id' => $id,
        'format' => $m['format'],
        'starts_at' => iso($m['starts_at']),
        'duration_min' => (int)$m['duration_min'],
        'max_players' => (int)$m['max_players'],
        'players_count' => $registered,
        'waitlist_count' => (int)($counts['waitlist'] ?? 0),
        'spots_left' => max(0, (int)$m['max_players'] - $registered),
        'level' => $m['level'] === null ? null : (int)$m['level'],
        'status' => match_status($m),
        'visibility' => $m['visibility'],
        'description' => $m['description'],
        'venue' => venue_view($venue),
        'organizer' => public_user($organizer),
        'home_team' => $team($m['home_team_id']),
        'away_team' => $team($m['away_team_id']),
        'my_status' => $mine['status'] ?? null,
        'is_organizer' => $viewerId !== null && (int)$m['organizer_id'] === $viewerId,
    ];
    if ($withPlayers) {
        $rows = query(
            'SELECT u.*, p.status AS p_status, p.team_id AS p_team FROM match_participants p JOIN users u ON u.id = p.user_id
             WHERE p.match_id = ? AND p.status <> "withdrawn" ORDER BY p.status = "waitlist", p.updated_at, p.created_at',
            [$id]
        )->fetchAll();
        $out['players'] = array_map(
            fn($u) => public_user($u) + ['status' => $u['p_status'], 'team_id' => $u['p_team'] === null ? null : (int)$u['p_team']],
            $rows
        );
    }
    return $out;
}

function check_team_member(?int $teamId, int $userId, string $field): void
{
    if ($teamId !== null && team_membership($teamId, $userId) === null) {
        throw new HttpError(422, 'validation_failed', 'Tu dois faire partie de cette équipe.', [$field => 'Pas membre de cette équipe.']);
    }
}

function match_validator(array $data, bool $partial): Validator
{
    return validate($data, $partial)
        ->int('venue_id', 1, PHP_INT_MAX)
        ->enum('format', FORMATS)
        ->datetime('starts_at')
        ->int('duration_min', 20, 240, false)
        ->int('max_players', 2, 30, false)
        ->int('level', 1, 5, false)
        ->int('home_team_id', 1, PHP_INT_MAX, false)
        ->int('away_team_id', 1, PHP_INT_MAX, false)
        ->enum('visibility', ['public', 'private'], false)
        ->string('description', 1, 500, false);
}

function register_match_routes(Router $r): void
{
    $r->post('/matches', function () {
        $user = require_user();
        $uid = (int)$user['id'];
        $data = body();
        $in = match_validator($data, false)->check();
        if (strtotime($in['starts_at'] . ' UTC') < time()) {
            throw new HttpError(422, 'validation_failed', 'Le match doit être dans le futur.', ['starts_at' => 'Date passée.']);
        }
        one('SELECT id FROM venues WHERE id = ?', [$in['venue_id']]) ?? not_found('Terrain');
        check_team_member($in['home_team_id'] ?? null, $uid, 'home_team_id');
        if (isset($in['away_team_id'])) {
            load_team($in['away_team_id']);
        }
        $join = ($data['join'] ?? true) !== false; // l'organisateur est inscrit d'office, sauf "join": false

        $id = transaction(function () use ($in, $uid, $join) {
            query(
                'INSERT INTO matches (organizer_id, venue_id, format, starts_at, duration_min, max_players, level,
                   home_team_id, away_team_id, visibility, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $uid, $in['venue_id'], $in['format'], $in['starts_at'], $in['duration_min'] ?? 60,
                    $in['max_players'] ?? DEFAULT_PLAYERS[$in['format']], $in['level'] ?? null,
                    $in['home_team_id'] ?? null, $in['away_team_id'] ?? null, $in['visibility'] ?? 'public',
                    $in['description'] ?? null,
                ]
            );
            $id = (int)db()->lastInsertId();
            if ($join) {
                query(
                    'INSERT INTO match_participants (match_id, user_id, team_id, status) VALUES (?, ?, ?, "registered")',
                    [$id, $uid, $in['home_team_id'] ?? null]
                );
            }
            refresh_match($id);
            return $id;
        });
        respond(201, match_view(load_match($id), $uid, true));
    });

    // Recherche des matchs publics à venir : ?lat=&lng=&radius_km=&format=&from=&to=&level=&spots=1
    $r->get('/matches', function () {
        $user = require_user();
        [$limit, $offset] = paging();
        $f = validate($_GET)
            ->enum('format', FORMATS, false)
            ->datetime('from', false)
            ->datetime('to', false)
            ->int('level', 1, 5, false)
            ->check();
        $select = 'm.*';
        $params = [];
        $where = ['m.visibility = "public"', 'm.status <> "cancelled"', 'm.starts_at >= ?'];
        $whereParams = [$f['from'] ?? gmdate('Y-m-d H:i:s')];
        $order = 'm.starts_at';
        if (!empty($f['to'])) {
            $where[] = 'm.starts_at <= ?';
            $whereParams[] = $f['to'];
        }
        if (!empty($f['format'])) {
            $where[] = 'm.format = ?';
            $whereParams[] = $f['format'];
        }
        if (!empty($f['level'])) {
            // Matchs sans niveau imposé, ou à un cran près du niveau demandé.
            $where[] = '(m.level IS NULL OR ABS(m.level - ?) <= 1)';
            $whereParams[] = $f['level'];
        }
        if (($_GET['spots'] ?? '') === '1') {
            $where[] = 'm.status = "open"';
        }
        if ($geo = geo_params(15)) {
            [$dist, $box, $distParams, $boxParams] = geo_filter('v', ...$geo);
            $select .= ", $dist AS distance_km";
            $params = $distParams;
            $where[] = $box;
            $where[] = "$dist <= ?";
            array_push($whereParams, ...[...$boxParams, ...$distParams, $geo[2]]);
            $order = 'distance_km, m.starts_at';
            if (($_GET['sort'] ?? '') === 'date') {
                $order = 'm.starts_at';
            }
        }
        $sql = "SELECT $select FROM matches m JOIN venues v ON v.id = m.venue_id WHERE " . implode(' AND ', $where)
            . " ORDER BY $order LIMIT $limit OFFSET $offset";
        $rows = query($sql, [...$params, ...$whereParams])->fetchAll();
        respond(200, ['items' => array_map(fn($m) => match_view($m, (int)$user['id']), $rows)]);
    });

    // Mes matchs (organisés ou rejoints) : ?when=upcoming|past
    $r->get('/me/matches', function () {
        $user = require_user();
        [$limit, $offset] = paging();
        $past = ($_GET['when'] ?? 'upcoming') === 'past';
        $rows = query(
            'SELECT DISTINCT m.* FROM matches m LEFT JOIN match_participants p ON p.match_id = m.id AND p.user_id = ? AND p.status <> "withdrawn"
             WHERE (m.organizer_id = ? OR p.user_id IS NOT NULL) AND m.starts_at ' . ($past ? '<' : '>=') . ' UTC_TIMESTAMP() - INTERVAL m.duration_min MINUTE
             ORDER BY m.starts_at ' . ($past ? 'DESC' : 'ASC') . " LIMIT $limit OFFSET $offset",
            [$user['id'], $user['id']]
        )->fetchAll();
        respond(200, ['items' => array_map(fn($m) => match_view($m, (int)$user['id']), $rows)]);
    });

    // Un match privé n'apparaît pas dans la recherche, mais reste accessible par son lien.
    $r->get('/matches/(\d+)', function (string $id) {
        $user = require_user();
        respond(200, match_view(load_match((int)$id), (int)$user['id'], true));
    });

    $r->patch('/matches/(\d+)', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $m = load_match((int)$id);
        if ((int)$m['organizer_id'] !== $uid) {
            forbidden('Seul l\'organisateur peut modifier le match.');
        }
        if (match_status($m) === 'played' || $m['status'] === 'cancelled') {
            throw new HttpError(409, 'match_closed', 'Ce match est terminé ou annulé.');
        }
        $in = match_validator(body(), true)->check();
        unset($in['format']); // le format fixe les places : on ne le change pas après coup
        if (isset($in['starts_at']) && strtotime($in['starts_at'] . ' UTC') < time()) {
            throw new HttpError(422, 'validation_failed', 'Le match doit être dans le futur.', ['starts_at' => 'Date passée.']);
        }
        if (isset($in['venue_id'])) {
            one('SELECT id FROM venues WHERE id = ?', [$in['venue_id']]) ?? not_found('Terrain');
        }
        if (array_key_exists('home_team_id', $in)) {
            check_team_member($in['home_team_id'], $uid, 'home_team_id');
        }
        if (!empty($in['away_team_id'])) {
            load_team($in['away_team_id']);
        }
        foreach (['venue_id', 'starts_at', 'max_players', 'duration_min', 'visibility'] as $required) {
            if (array_key_exists($required, $in) && $in[$required] === null) {
                unset($in[$required]);
            }
        }
        transaction(function () use ($in, $m) {
            if ($in) {
                $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($in)));
                query("UPDATE matches SET $sets WHERE id = ?", [...array_values($in), $m['id']]);
            }
            // Si on réduit les places, les derniers inscrits repassent en liste d'attente.
            if (isset($in['max_players'])) {
                $over = registered_count((int)$m['id']) - $in['max_players'];
                if ($over > 0) {
                    query(
                        'UPDATE match_participants SET status = "waitlist" WHERE match_id = ? AND status = "registered" AND user_id <> ?
                         ORDER BY updated_at DESC, created_at DESC LIMIT ' . $over,
                        [$m['id'], $m['organizer_id']]
                    );
                }
            }
            refresh_match((int)$m['id']);
        });
        respond(200, match_view(load_match((int)$id), $uid, true));
    });

    $r->post('/matches/(\d+)/cancel', function (string $id) {
        $user = require_user();
        $m = load_match((int)$id);
        if ((int)$m['organizer_id'] !== (int)$user['id']) {
            forbidden('Seul l\'organisateur peut annuler le match.');
        }
        query('UPDATE matches SET status = "cancelled" WHERE id = ?', [$m['id']]);
        respond(200, match_view(load_match((int)$id), (int)$user['id']));
    });

    // S'inscrire : place libre -> inscrit, sinon liste d'attente. Corps facultatif : {"team_id": 3}
    $r->post('/matches/(\d+)/join', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $in = validate(body())->int('team_id', 1, PHP_INT_MAX, false)->check();
        check_team_member($in['team_id'] ?? null, $uid, 'team_id');
        transaction(function () use ($id, $uid, $in) {
            $m = load_match((int)$id, true);
            if ($m['status'] === 'cancelled' || match_status($m) === 'played') {
                throw new HttpError(409, 'match_closed', 'Ce match est terminé ou annulé.');
            }
            $current = one('SELECT status FROM match_participants WHERE match_id = ? AND user_id = ?', [$m['id'], $uid]);
            if ($current && $current['status'] !== 'withdrawn') {
                if (array_key_exists('team_id', $in)) {
                    query('UPDATE match_participants SET team_id = ? WHERE match_id = ? AND user_id = ?', [$in['team_id'], $m['id'], $uid]);
                }
                return;
            }
            $status = registered_count((int)$m['id']) < (int)$m['max_players'] ? 'registered' : 'waitlist';
            query(
                'INSERT INTO match_participants (match_id, user_id, team_id, status) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), team_id = VALUES(team_id), updated_at = CURRENT_TIMESTAMP',
                [$m['id'], $uid, $in['team_id'] ?? null, $status]
            );
            refresh_match((int)$m['id']);
        });
        respond(200, match_view(load_match((int)$id), $uid, true));
    });

    // Se désister : la première personne en liste d'attente prend la place.
    $r->delete('/matches/(\d+)/join', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        transaction(function () use ($id, $uid) {
            $m = load_match((int)$id, true);
            if (match_status($m) === 'played') {
                throw new HttpError(409, 'match_closed', 'Ce match est déjà joué.');
            }
            query(
                'UPDATE match_participants SET status = "withdrawn" WHERE match_id = ? AND user_id = ? AND status <> "withdrawn"',
                [$m['id'], $uid]
            );
            refresh_match((int)$m['id']);
        });
        respond(200, match_view(load_match((int)$id), $uid, true));
    });
}
