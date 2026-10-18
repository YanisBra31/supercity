<?php
// Matchs : création, recherche autour de soi, inscription avec liste d'attente, annulation.
declare(strict_types=1);

// Places par défaut selon le format (modifiables à la création).
const DEFAULT_PLAYERS = ['city5' => 10, 'futsal' => 10, 'foot8' => 16, 'foot11' => 22];
// Un tournoi (espace pro) accueille plus de joueurs et dure plus longtemps qu'un match.
const MATCH_MAX_PLAYERS = 30;
const TOURNAMENT_MAX_PLAYERS = 200;
const MATCH_MAX_MINUTES = 240;
const TOURNAMENT_MAX_MINUTES = 720;

function load_match(int $id, bool $lock = false): array
{
    return one('SELECT * FROM matches WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), [$id]) ?? not_found('Match');
}

/** Places prises : inscrits, plus les places réservées en attente de paiement. */
function registered_count(int $matchId): int
{
    return (int)one(
        'SELECT COUNT(*) AS n FROM match_participants WHERE match_id = ?
         AND (status = "registered" OR (status = "pending" AND hold_until > UTC_TIMESTAMP()))',
        [$matchId]
    )['n'];
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
    expire_holds($matchId);
    $free = (int)$m['max_players'] - registered_count($matchId);
    if ($free > 0) {
        // Match payant : la place est réservée, le joueur a quelques heures pour la payer.
        $paid = (int)$m['price_cents'] > 0;
        $promoted = array_column(query(
            'SELECT user_id FROM match_participants WHERE match_id = ? AND status = "waitlist" ORDER BY updated_at, created_at LIMIT ' . $free,
            [$matchId]
        )->fetchAll(), 'user_id');
        query(
            'UPDATE match_participants SET status = ' . ($paid ? '"pending", hold_until = ?' : '"registered"') . '
             WHERE match_id = ? AND status = "waitlist" ORDER BY updated_at, created_at LIMIT ' . $free,
            $paid ? [promoted_hold($m), $matchId] : [$matchId]
        );
        $where = 'à ' . (one('SELECT name FROM venues WHERE id = ?', [$m['venue_id']])['name'] ?? 'ton terrain') . ', ' . fr_when($m['starts_at']);
        notify(
            $promoted,
            'waitlist',
            'Une place s\'est libérée',
            $paid ? "Tu sors de la liste d'attente $where. Paie ta place vite pour la garder." : "Tu sors de la liste d'attente : tu joues $where.",
            "/match/$matchId"
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
    $taken = registered_count($id);
    $mine = $viewerId ? one('SELECT status, team_id, hold_until FROM match_participants WHERE match_id = ? AND user_id = ?', [$id, $viewerId]) : null;
    if ($mine && $mine['status'] === 'pending' && strtotime($mine['hold_until'] . ' UTC') <= time()) {
        $mine['status'] = 'withdrawn';
    }
    $price = (int)$m['price_cents'];
    $team = fn($tid) => $tid ? (($t = one('SELECT id, name, logo_url, color_primary, color_secondary FROM teams WHERE id = ?', [$tid]))
        ? ['id' => (int)$t['id'], 'name' => $t['name'], 'logo_url' => $t['logo_url'], 'color_primary' => $t['color_primary'], 'color_secondary' => $t['color_secondary'],
            'streak' => team_streak((int)$t['id'])['current']]
        : null) : null;
    $bonus = match_bonus($m);
    $organizer = one('SELECT * FROM users WHERE id = ?', [$m['organizer_id']]);
    $org = $m['organization_id'] ? one('SELECT * FROM organizations WHERE id = ?', [$m['organization_id']]) : null;
    $isOrganizer = $viewerId !== null && (int)$m['organizer_id'] === $viewerId;

    $out = [
        'id' => $id,
        'kind' => $m['kind'],
        'title' => $m['title'],
        'format' => $m['format'],
        'starts_at' => iso($m['starts_at']),
        'duration_min' => (int)$m['duration_min'],
        'max_players' => (int)$m['max_players'],
        'players_count' => $registered,
        'waitlist_count' => (int)($counts['waitlist'] ?? 0),
        'spots_left' => max(0, (int)$m['max_players'] - $taken),
        'price_cents' => $price,
        'fee_cents' => $price > 0 ? service_fee() : 0,
        'level' => $m['level'] === null ? null : (int)$m['level'],
        'status' => match_status($m),
        'visibility' => $m['visibility'],
        'description' => $m['description'],
        'venue' => venue_view($venue),
        'organizer' => public_user($organizer),
        'organization' => $org ? org_public_view($org) : null,
        'home_team' => $team($m['home_team_id']),
        'away_team' => $team($m['away_team_id']),
        'my_status' => $mine['status'] ?? null,
        'my_hold_until' => ($mine['status'] ?? null) === 'pending' ? iso($mine['hold_until']) : null,
        'my_paid' => $price > 0 && $viewerId !== null && paid_payment($id, $viewerId) !== null,
        'is_organizer' => $isOrganizer,
        // Ce que l'organisation touche par place, commission Supercity déduite (vu par l'organisateur seulement).
        'payout_cents' => $isOrganizer && $price > 0 ? $price - commission_cents($price, $org) : null,
        'score' => score_view($m, $viewerId),
        'bonus' => $bonus ? bonus_event_view($bonus) : null,
        // Match fini : le joueur peut noter les autres pendant 7 jours ; combien il lui en reste.
        // Messages non lus de la discussion du match, pour ceux qui y ont accès.
        'chat_unread' => $viewerId !== null && ($isOrganizer || ($mine && $mine['status'] !== 'withdrawn')) ? chat_unread('match', $id, $viewerId) : null,
        'ratings_left' => rating_open($m, $viewerId)
            ? (int)one(
                'SELECT COUNT(*) AS n FROM match_participants p LEFT JOIN player_ratings r ON r.match_id = p.match_id AND r.rater_id = ? AND r.rated_id = p.user_id
                 WHERE p.match_id = ? AND p.status = "registered" AND p.user_id <> ? AND r.rated_id IS NULL',
                [$viewerId, $id, $viewerId]
            )['n']
            : null,
    ];
    if ($withPlayers) {
        $out['venue']['king'] = venue_king((int)$m['venue_id']);
        $rows = query(
            'SELECT u.*, p.status AS p_status, p.team_id AS p_team FROM match_participants p JOIN users u ON u.id = p.user_id
             WHERE p.match_id = ? AND p.status IN ("registered", "waitlist") ORDER BY p.status = "waitlist", p.updated_at, p.created_at',
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
        ->int('duration_min', 20, TOURNAMENT_MAX_MINUTES, false)
        ->int('max_players', 2, TOURNAMENT_MAX_PLAYERS, false)
        ->int('level', 1, 5, false)
        ->int('home_team_id', 1, PHP_INT_MAX, false)
        ->int('away_team_id', 1, PHP_INT_MAX, false)
        ->enum('visibility', ['public', 'private'], false)
        ->string('description', 1, 500, false)
        ->int('price_cents', 0, PRICE_MAX_CENTS, false)
        ->int('organization_id', 1, PHP_INT_MAX, false)
        ->enum('kind', ['match', 'tournament'], false)
        ->string('title', 3, 80, false);
}

/** Organisation au nom de laquelle on publie : forcément la sienne. */
function event_organization(?int $orgId, array $user): ?array
{
    if ($orgId === null) {
        return null;
    }
    $o = my_organization((int)$user['id']);
    if (!$o || (int)$o['id'] !== $orgId) {
        forbidden('Tu ne peux publier que pour ton propre espace pro.');
    }
    return $o;
}

/** Tournoi : réservé aux pros, avec un nom. Les grands effectifs et les longues durées sont réservés aux tournois. */
function check_event(string $kind, ?array $org, ?string $title, ?int $players, ?int $minutes): void
{
    if ($kind === 'tournament') {
        if (!$org) {
            throw new HttpError(409, 'pro_only', 'Les tournois sont réservés aux espaces pro.', ['kind' => 'Réservé aux pros.']);
        }
        if ($title === null) {
            throw new HttpError(422, 'validation_failed', 'Donne un nom au tournoi.', ['title' => 'Obligatoire pour un tournoi.']);
        }
        return;
    }
    if ($players !== null && $players > MATCH_MAX_PLAYERS) {
        throw new HttpError(422, 'validation_failed', 'Un match accueille ' . MATCH_MAX_PLAYERS . ' joueurs au plus.', ['max_players' => 'Au plus ' . MATCH_MAX_PLAYERS . '.']);
    }
    if ($minutes !== null && $minutes > MATCH_MAX_MINUTES) {
        throw new HttpError(422, 'validation_failed', 'Un match dure 4 h au plus.', ['duration_min' => 'Au plus 4 h.']);
    }
}

/** Un match payant est publié par un espace pro prêt à encaisser, avec un prix d'au moins 1 €. */
function check_price(array $in, ?array $org): void
{
    $price = $in['price_cents'] ?? 0;
    if ($price === null || $price === 0) {
        return;
    }
    if ($price < 100) {
        throw new HttpError(422, 'validation_failed', 'Prix minimum : 1 €.', ['price_cents' => 'Au moins 1 €.']);
    }
    if (!stripe_config()) {
        throw new HttpError(503, 'payments_disabled', "Le paiement en ligne n'est pas encore activé.");
    }
    if (!$org) {
        throw new HttpError(409, 'pro_only', 'Les matchs payants sont réservés aux espaces pro.', ['price_cents' => 'Réservé aux pros.']);
    }
    if (!$org['stripe_ready']) {
        throw new HttpError(409, 'payouts_not_ready', 'Active les paiements dans ton espace pro pour fixer un prix.');
    }
}

function register_match_routes(Router $r): void
{
    $r->post('/matches', function () {
        $user = require_user();
        $uid = (int)$user['id'];
        $data = body();
        $in = match_validator($data, false)->check();
        $org = event_organization($in['organization_id'] ?? null, $user);
        $kind = $in['kind'] ?? 'match';
        check_event($kind, $org, $in['title'] ?? null, $in['max_players'] ?? null, $in['duration_min'] ?? null);
        check_price($in, $org);
        if (strtotime($in['starts_at'] . ' UTC') < time()) {
            throw new HttpError(422, 'validation_failed', 'Le match doit être dans le futur.', ['starts_at' => 'Date passée.']);
        }
        one('SELECT id FROM venues WHERE id = ?', [$in['venue_id']]) ?? not_found('Terrain');
        check_team_member($in['home_team_id'] ?? null, $uid, 'home_team_id');
        if (isset($in['away_team_id'])) {
            load_team($in['away_team_id']);
        }
        // L'organisateur est inscrit d'office, sauf "join": false, ou s'il publie pour son espace pro.
        $join = ($data['join'] ?? !$org) !== false;

        $id = transaction(function () use ($in, $uid, $join, $org, $kind) {
            query(
                'INSERT INTO matches (organizer_id, organization_id, kind, title, venue_id, format, starts_at, duration_min, max_players, level,
                   home_team_id, away_team_id, visibility, description, price_cents)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $uid, $org['id'] ?? null, $kind, $in['title'] ?? null,
                    $in['venue_id'], $in['format'], $in['starts_at'], $in['duration_min'] ?? ($kind === 'tournament' ? 240 : 60),
                    $in['max_players'] ?? DEFAULT_PLAYERS[$in['format']], $in['level'] ?? null,
                    $in['home_team_id'] ?? null, $in['away_team_id'] ?? null, $in['visibility'] ?? 'public',
                    $in['description'] ?? null, $in['price_cents'] ?? 0,
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
        notify_friends_of_match($id, $user, true);
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
            ->enum('kind', ['match', 'tournament'], false)
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
        if (!empty($f['kind'])) {
            $where[] = 'm.kind = ?';
            $whereParams[] = $f['kind'];
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
        // Une place réservée non payée à temps revient à la liste d'attente.
        if (one('SELECT 1 FROM match_participants WHERE match_id = ? AND status = "pending" AND hold_until <= UTC_TIMESTAMP() LIMIT 1', [(int)$id])) {
            transaction(fn() => refresh_match((int)$id));
        }
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
        unset($in['format'], $in['organization_id'], $in['kind']); // fixés à la création
        $org = $m['organization_id'] ? one('SELECT * FROM organizations WHERE id = ?', [$m['organization_id']]) : null;
        check_event(
            $m['kind'],
            $org,
            array_key_exists('title', $in) ? $in['title'] : $m['title'],
            $in['max_players'] ?? null,
            $in['duration_min'] ?? null
        );
        if (array_key_exists('price_cents', $in)) {
            $in['price_cents'] ??= 0;
            if ($in['price_cents'] !== (int)$m['price_cents']) {
                if (one('SELECT id FROM payments WHERE match_id = ? AND status IN ("open", "paid") LIMIT 1', [$m['id']])) {
                    throw new HttpError(409, 'price_locked', 'Des joueurs ont déjà payé : le prix ne peut plus changer.', ['price_cents' => 'Déjà payé par des joueurs.']);
                }
                check_price($in, $org);
            }
        }
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
        refund_all((int)$m['id']);
        if (strtotime($m['starts_at'] . ' UTC') > time()) {
            $players = array_column(query(
                'SELECT user_id FROM match_participants WHERE match_id = ? AND status <> "withdrawn" AND user_id <> ?',
                [$m['id'], $user['id']]
            )->fetchAll(), 'user_id');
            $paid = (int)$m['price_cents'] > 0 ? ' Tu es remboursé en entier.' : '';
            notify($players, 'cancelled', 'Match annulé', "{$user['display_name']} a annulé le match du " . fr_when($m['starts_at']) . ".$paid", "/match/{$m['id']}", (int)$user['id']);
        }
        respond(200, match_view(load_match((int)$id), (int)$user['id']));
    });

    // S'inscrire : place libre -> inscrit, sinon liste d'attente. Corps facultatif : {"team_id": 3}
    // Match payant : la place est réservée 30 min et la réponse contient checkout_url, la page de paiement.
    $r->post('/matches/(\d+)/join', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $in = validate(body())->int('team_id', 1, PHP_INT_MAX, false)->string('return_url', 1, 500, false)->check();
        check_team_member($in['team_id'] ?? null, $uid, 'team_id');
        $pay = transaction(function () use ($id, $uid, $in) {
            $m = load_match((int)$id, true);
            if ($m['status'] === 'cancelled' || match_status($m) === 'played') {
                throw new HttpError(409, 'match_closed', 'Ce match est terminé ou annulé.');
            }
            expire_holds((int)$m['id']);
            // Déjà payé (désistement tardif non remboursé, puis retour) : pas de second paiement.
            $paid = (int)$m['price_cents'] > 0 && (int)$m['organizer_id'] !== $uid && !paid_payment((int)$m['id'], $uid);
            $current = one('SELECT status FROM match_participants WHERE match_id = ? AND user_id = ?', [$m['id'], $uid]);
            if ($current && $current['status'] !== 'withdrawn') {
                if (array_key_exists('team_id', $in)) {
                    query('UPDATE match_participants SET team_id = ? WHERE match_id = ? AND user_id = ?', [$in['team_id'], $m['id'], $uid]);
                }
                return $current['status'] === 'pending' ? $m : null;
            }
            if ($paid && !payee($m)['stripe_ready']) {
                throw new HttpError(409, 'organizer_not_ready', "L'organisateur ne peut pas encore encaisser. Réessaie plus tard.");
            }
            $free = registered_count((int)$m['id']) < (int)$m['max_players'];
            $status = !$free ? 'waitlist' : ($paid ? 'pending' : 'registered');
            query(
                'INSERT INTO match_participants (match_id, user_id, team_id, status, hold_until) VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), team_id = VALUES(team_id), hold_until = VALUES(hold_until), updated_at = CURRENT_TIMESTAMP',
                [$m['id'], $uid, $in['team_id'] ?? null, $status, $status === 'pending' ? gmdate('Y-m-d H:i:s', time() + HOLD_MINUTES * 60) : null]
            );
            refresh_match((int)$m['id']);
            return $status === 'pending' ? $m : null;
        });
        $checkout = null;
        if ($pay) {
            try {
                $checkout = create_checkout($pay, $user, app_return($in['return_url'] ?? null));
            } catch (HttpError $e) {
                // Pas de page de paiement : on rend la place tout de suite.
                transaction(function () use ($pay, $uid) {
                    query('UPDATE match_participants SET status = "withdrawn", hold_until = NULL WHERE match_id = ? AND user_id = ? AND status = "pending"', [$pay['id'], $uid]);
                    refresh_match((int)$pay['id']);
                });
                throw $e;
            }
        }
        if (!$pay && (one('SELECT status FROM match_participants WHERE match_id = ? AND user_id = ?', [(int)$id, $uid])['status'] ?? null) === 'registered') {
            notify_friends_of_match((int)$id, $user, false);
        }
        respond(200, match_view(load_match((int)$id), $uid, true) + ['checkout_url' => $checkout]);
    });

    // Se désister : la première personne en liste d'attente prend la place.
    // Match payant : remboursé (hors frais de service) jusqu'à 24 h avant le coup d'envoi.
    $r->delete('/matches/(\d+)/join', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $m = transaction(function () use ($id, $uid) {
            $m = load_match((int)$id, true);
            if (match_status($m) === 'played') {
                throw new HttpError(409, 'match_closed', 'Ce match est déjà joué.');
            }
            query(
                'UPDATE match_participants SET status = "withdrawn", hold_until = NULL WHERE match_id = ? AND user_id = ? AND status <> "withdrawn"',
                [$m['id'], $uid]
            );
            refresh_match((int)$m['id']);
            return $m;
        });
        $refunded = (int)$m['price_cents'] > 0 ? settle_withdrawal($m, $uid) : null;
        respond(200, match_view(load_match((int)$id), $uid, true) + ['refunded_cents' => $refunded]);
    });
}
