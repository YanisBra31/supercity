<?php
// Défis entre équipes : une équipe en invite une autre à l'affronter, sur un de ses matchs ou sur un nouveau créneau.
declare(strict_types=1);

const RIVAL_WINDOW_HOURS = 3;

function team_brief(int $teamId): array
{
    $t = load_team($teamId);
    return [
        'id' => (int)$t['id'],
        'name' => $t['name'],
        'logo_url' => $t['logo_url'],
        'color_primary' => $t['color_primary'],
        'color_secondary' => $t['color_secondary'],
        'city' => $t['city'],
    ];
}

function require_captain(int $teamId, int $userId, string $message): array
{
    $team = load_team($teamId);
    if ((int)$team['captain_id'] !== $userId) {
        forbidden($message);
    }
    return $team;
}

/** Date de début effective du défi (match visé ou créneau proposé). */
function challenge_start(array $c): ?string
{
    if ($c['match_id'] !== null) {
        return one('SELECT starts_at FROM matches WHERE id = ?', [$c['match_id']])['starts_at'] ?? null;
    }
    return $c['starts_at'];
}

function challenge_status(array $c): string
{
    $start = challenge_start($c);
    if ($c['status'] === 'pending' && $start !== null && strtotime($start . ' UTC') < time()) {
        return 'expired';
    }
    return $c['status'];
}

function challenge_view(array $c, int $viewerId): array
{
    $status = challenge_status($c);
    $match = $c['match_id'] !== null ? one('SELECT * FROM matches WHERE id = ?', [$c['match_id']]) : null;
    $venueId = $match['venue_id'] ?? $c['venue_id'];
    $venue = $venueId !== null ? one('SELECT * FROM venues WHERE id = ?', [$venueId]) : null;
    $from = team_brief((int)$c['from_team_id']);
    $to = team_brief((int)$c['to_team_id']);
    $author = one('SELECT * FROM users WHERE id = ?', [$c['created_by']]);
    $toCaptain = (int)load_team((int)$c['to_team_id'])['captain_id'] === $viewerId;
    $fromCaptain = (int)load_team((int)$c['from_team_id'])['captain_id'] === $viewerId;
    return [
        'id' => (int)$c['id'],
        'from_team' => $from,
        'to_team' => $to,
        'created_by' => $author ? public_user($author) : null,
        'match_id' => $c['match_id'] === null ? null : (int)$c['match_id'],
        'starts_at' => iso(challenge_start($c)),
        'duration_min' => (int)($match['duration_min'] ?? $c['duration_min']),
        'format' => $match['format'] ?? $c['format'],
        'venue' => $venue ? venue_view($venue) : null,
        'message' => $c['message'],
        'status' => $status,
        'response_message' => $c['response_message'],
        'created_at' => iso($c['created_at']),
        'responded_at' => iso($c['responded_at']),
        'can_respond' => $status === 'pending' && $toCaptain,
        'can_cancel' => $status === 'pending' && $fromCaptain,
    ];
}

function load_challenge(int $id, bool $lock = false): array
{
    return one('SELECT * FROM challenges WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), [$id]) ?? not_found('Défi');
}

/** Inscrit un joueur à un match avec son équipe (ou met à jour son équipe s'il y est déjà). */
function enlist(int $matchId, int $userId, int $teamId): void
{
    $current = one('SELECT status FROM match_participants WHERE match_id = ? AND user_id = ?', [$matchId, $userId]);
    if ($current && $current['status'] !== 'withdrawn') {
        query('UPDATE match_participants SET team_id = ? WHERE match_id = ? AND user_id = ?', [$teamId, $matchId, $userId]);
        return;
    }
    $m = load_match($matchId, true);
    $status = registered_count($matchId) < (int)$m['max_players'] ? 'registered' : 'waitlist';
    query(
        'INSERT INTO match_participants (match_id, user_id, team_id, status) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), team_id = VALUES(team_id), updated_at = CURRENT_TIMESTAMP',
        [$matchId, $userId, $teamId, $status]
    );
}

/** Le match visé par un défi doit être à venir, sans adversaire, et appartenir à l'une des deux équipes. */
function check_challenge_match(array $m, int $fromTeam, int $toTeam): void
{
    if ($m['status'] === 'cancelled' || match_status($m) === 'played') {
        throw new HttpError(409, 'match_closed', 'Ce match est terminé ou annulé.');
    }
    if ((int)$m['price_cents'] > 0) {
        throw new HttpError(409, 'match_paid', 'Les défis se jouent sur des matchs gratuits.');
    }
    if ($m['away_team_id'] !== null) {
        throw new HttpError(409, 'match_has_opponent', 'Ce match a déjà un adversaire.');
    }
    if (!in_array((int)$m['home_team_id'], [$fromTeam, $toTeam], true)) {
        throw new HttpError(422, 'validation_failed', "Ce match n'appartient à aucune des deux équipes.", ['match_id' => 'Match d\'une autre équipe.']);
    }
}

function register_challenge_routes(Router $r): void
{
    $r->post('/challenges', function () {
        $user = require_user();
        $uid = (int)$user['id'];
        $data = body();
        $v = validate($data)
            ->int('from_team_id', 1, PHP_INT_MAX)
            ->int('to_team_id', 1, PHP_INT_MAX)
            ->int('match_id', 1, PHP_INT_MAX, false)
            ->string('message', 1, 300, false);
        $hasMatch = isset($data['match_id']);
        if (!$hasMatch) {
            $v->int('venue_id', 1, PHP_INT_MAX)->enum('format', FORMATS)->datetime('starts_at')->int('duration_min', 20, 240, false);
        }
        $in = $v->check();
        if ($in['from_team_id'] === $in['to_team_id']) {
            throw new HttpError(422, 'validation_failed', 'Une équipe ne peut pas se défier elle-même.', ['to_team_id' => 'Choisis une autre équipe.']);
        }
        require_captain($in['from_team_id'], $uid, 'Seul le capitaine peut lancer un défi.');
        load_team($in['to_team_id']);
        if ($hasMatch) {
            check_challenge_match(load_match($in['match_id']), $in['from_team_id'], $in['to_team_id']);
        } else {
            if (strtotime($in['starts_at'] . ' UTC') < time()) {
                throw new HttpError(422, 'validation_failed', 'Le défi doit être dans le futur.', ['starts_at' => 'Date passée.']);
            }
            one('SELECT id FROM venues WHERE id = ?', [$in['venue_id']]) ?? not_found('Terrain');
        }
        $dup = one(
            'SELECT id FROM challenges WHERE status = "pending" AND from_team_id = ? AND to_team_id = ? AND match_id <=> ? AND starts_at <=> ?',
            [$in['from_team_id'], $in['to_team_id'], $in['match_id'] ?? null, $in['starts_at'] ?? null]
        );
        if ($dup) {
            throw new HttpError(409, 'challenge_exists', 'Ce défi a déjà été envoyé, il attend une réponse.');
        }
        query(
            'INSERT INTO challenges (from_team_id, to_team_id, created_by, match_id, venue_id, format, starts_at, duration_min, message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $in['from_team_id'], $in['to_team_id'], $uid, $in['match_id'] ?? null, $in['venue_id'] ?? null,
                $in['format'] ?? null, $in['starts_at'] ?? null, $in['duration_min'] ?? 60, $in['message'] ?? null,
            ]
        );
        respond(201, challenge_view(load_challenge((int)db()->lastInsertId()), $uid));
    });

    // Défis reçus et envoyés par les équipes dont je fais partie.
    $r->get('/me/challenges', function () {
        $user = require_user();
        $uid = (int)$user['id'];
        $rows = query(
            'SELECT DISTINCT c.* FROM challenges c JOIN team_members m ON m.team_id IN (c.from_team_id, c.to_team_id)
             WHERE m.user_id = ? AND (c.status = "pending" OR c.created_at > UTC_TIMESTAMP() - INTERVAL 30 DAY)
             ORDER BY c.status = "pending" DESC, c.created_at DESC LIMIT 50',
            [$uid]
        )->fetchAll();
        $mine = array_column(query('SELECT team_id FROM team_members WHERE user_id = ?', [$uid])->fetchAll(), 'team_id');
        $mine = array_map('intval', $mine);
        $received = $sent = [];
        foreach ($rows as $c) {
            $view = challenge_view($c, $uid);
            if (in_array((int)$c['to_team_id'], $mine, true)) {
                $received[] = $view;
            } else {
                $sent[] = $view;
            }
        }
        respond(200, ['received' => $received, 'sent' => $sent]);
    });

    $r->get('/challenges/(\d+)', function (string $id) {
        $user = require_user();
        $c = load_challenge((int)$id);
        if (!team_membership((int)$c['from_team_id'], (int)$user['id']) && !team_membership((int)$c['to_team_id'], (int)$user['id'])) {
            forbidden('Ce défi ne concerne pas tes équipes.');
        }
        respond(200, challenge_view($c, (int)$user['id']));
    });

    // Accepter : le match existant reçoit son adversaire, ou un nouveau match est créé ; les deux capitaines y sont inscrits.
    $r->post('/challenges/(\d+)/accept', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $in = validate(body())->string('message', 1, 300, false)->check();
        transaction(function () use ($id, $uid, $in) {
            $c = load_challenge((int)$id, true);
            require_captain((int)$c['to_team_id'], $uid, 'Seul le capitaine de l\'équipe défiée peut répondre.');
            if (challenge_status($c) !== 'pending') {
                throw new HttpError(409, 'challenge_closed', 'Ce défi a déjà eu une réponse ou a expiré.');
            }
            $from = (int)$c['from_team_id'];
            $to = (int)$c['to_team_id'];
            if ($c['match_id'] !== null) {
                $m = load_match((int)$c['match_id'], true);
                check_challenge_match($m, $from, $to);
                $home = (int)$m['home_team_id'];
                $away = $home === $from ? $to : $from;
                query('UPDATE matches SET away_team_id = ? WHERE id = ?', [$away, $m['id']]);
                $matchId = (int)$m['id'];
                // Le capitaine de l'équipe qui arrive rejoint le match.
                enlist($matchId, $away === $to ? $uid : (int)$c['created_by'], $away);
            } else {
                $v = one('SELECT id FROM venues WHERE id = ?', [$c['venue_id']]) ?? not_found('Terrain');
                query(
                    'INSERT INTO matches (organizer_id, venue_id, format, starts_at, duration_min, max_players, home_team_id, away_team_id, visibility, description)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, "public", ?)',
                    [
                        $c['created_by'], $v['id'], $c['format'], $c['starts_at'], $c['duration_min'],
                        DEFAULT_PLAYERS[$c['format']], $from, $to, $c['message'],
                    ]
                );
                $matchId = (int)db()->lastInsertId();
                enlist($matchId, (int)$c['created_by'], $from);
                enlist($matchId, $uid, $to);
            }
            refresh_match($matchId);
            query(
                'UPDATE challenges SET status = "accepted", match_id = ?, responded_by = ?, responded_at = UTC_TIMESTAMP(), response_message = ? WHERE id = ?',
                [$matchId, $uid, $in['message'] ?? null, $c['id']]
            );
            post_challenge_accepted($uid, $from, $to, $matchId);
            // Les autres défis en attente sur ce même match n'ont plus lieu d'être.
            query('UPDATE challenges SET status = "cancelled" WHERE match_id = ? AND status = "pending" AND id <> ?', [$matchId, $c['id']]);
        });
        respond(200, challenge_view(load_challenge((int)$id), $uid));
    });

    $r->post('/challenges/(\d+)/decline', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $in = validate(body())->string('message', 1, 300, false)->check();
        $c = load_challenge((int)$id);
        require_captain((int)$c['to_team_id'], $uid, 'Seul le capitaine de l\'équipe défiée peut répondre.');
        if (challenge_status($c) !== 'pending') {
            throw new HttpError(409, 'challenge_closed', 'Ce défi a déjà eu une réponse ou a expiré.');
        }
        query(
            'UPDATE challenges SET status = "declined", responded_by = ?, responded_at = UTC_TIMESTAMP(), response_message = ? WHERE id = ?',
            [$uid, $in['message'] ?? null, $c['id']]
        );
        respond(200, challenge_view(load_challenge((int)$id), $uid));
    });

    $r->post('/challenges/(\d+)/cancel', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $c = load_challenge((int)$id);
        require_captain((int)$c['from_team_id'], $uid, 'Seul le capitaine qui a lancé le défi peut l\'annuler.');
        if (challenge_status($c) !== 'pending') {
            throw new HttpError(409, 'challenge_closed', 'Ce défi a déjà eu une réponse ou a expiré.');
        }
        query('UPDATE challenges SET status = "cancelled" WHERE id = ?', [$c['id']]);
        respond(200, challenge_view(load_challenge((int)$id), $uid));
    });

    // Équipes qui jouent sur le même terrain, à quelques heures près : adversaires tout trouvés.
    $r->get('/matches/(\d+)/rivals', function (string $id) {
        $user = require_user();
        $m = load_match((int)$id);
        $own = array_filter([(int)$m['home_team_id'], (int)$m['away_team_id']]);
        $rows = query(
            'SELECT o.id AS match_id, o.starts_at, o.home_team_id, o.away_team_id FROM matches o
             WHERE o.venue_id = ? AND o.id <> ? AND o.status <> "cancelled"
               AND o.starts_at BETWEEN ? - INTERVAL ' . RIVAL_WINDOW_HOURS . ' HOUR AND ? + INTERVAL ' . RIVAL_WINDOW_HOURS . ' HOUR
               AND o.starts_at > UTC_TIMESTAMP() - INTERVAL 2 HOUR
             ORDER BY ABS(TIMESTAMPDIFF(MINUTE, o.starts_at, ?))',
            [$m['venue_id'], $m['id'], $m['starts_at'], $m['starts_at'], $m['starts_at']]
        )->fetchAll();
        $seen = [];
        $items = [];
        foreach ($rows as $o) {
            foreach ([$o['home_team_id'], $o['away_team_id']] as $teamId) {
                if ($teamId === null || in_array((int)$teamId, $own, true) || isset($seen[(int)$teamId])) {
                    continue;
                }
                $seen[(int)$teamId] = true;
                $items[] = ['team' => team_brief((int)$teamId), 'match_id' => (int)$o['match_id'], 'starts_at' => iso($o['starts_at'])];
            }
        }
        respond(200, ['items' => $items]);
    });
}
