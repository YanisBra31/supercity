<?php
// Notifications sur les téléphones, envoyées par le service push d'Expo : événements bonus, séries sur les terrains proches,
// score à confirmer. Celles qui concernent un joueur passent par notify() (social.php) et restent dans sa boîte de réception. Les alertes en attente partent dès qu'un joueur ouvre l'appli (ou via /cron/notifications).
declare(strict_types=1);

const PUSH_RADIUS_KM = 25;
const PUSH_BATCH = 100;
const PUSH_TOKEN_PATTERN = '/^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$/';

/** Paliers de série annoncés : 3, 5, puis toutes les 5 victoires. */
function streak_milestone(int $n): bool
{
    return $n === 3 || ($n >= 5 && $n % 5 === 0);
}

/** « dimanche 19 oct. à 23h59 », heure de Paris. */
function fr_when(string $mysqlDate): string
{
    $days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    $months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    $d = (new DateTimeImmutable($mysqlDate, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/Paris'));
    return $days[(int)$d->format('w')] . ' ' . $d->format('j') . ' ' . $months[(int)$d->format('n') - 1] . ' à ' . $d->format('H\hi');
}

/** Envoie des messages au service push d'Expo, par paquets ; oublie les téléphones qui n'existent plus. */
function push_send(array $tokens, string $title, string $body, array $data = []): int
{
    $tokens = array_values(array_unique($tokens));
    if (!$tokens) {
        return 0;
    }
    $cfg = config()['push'] ?? [];
    $url = $cfg['url'] ?? 'https://exp.host/--/api/v2/push/send';
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if (!empty($cfg['access_token'])) {
        $headers[] = 'Authorization: Bearer ' . $cfg['access_token'];
    }
    $sent = 0;
    foreach (array_chunk($tokens, PUSH_BATCH) as $chunk) {
        $messages = array_map(fn($t) => ['to' => $t, 'title' => $title, 'body' => $body, 'data' => $data, 'sound' => 'default', 'channelId' => 'default'], $chunk);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode($messages),
            CURLOPT_TIMEOUT => 10,
        ]);
        $res = json_decode((string)curl_exec($ch), true);
        if (!is_array($res['data'] ?? null)) {
            error_log('supercity push: réponse inattendue du service Expo');
            continue;
        }
        foreach ($res['data'] as $i => $ticket) {
            if (($ticket['status'] ?? '') === 'ok') {
                $sent++;
            } elseif (($ticket['details']['error'] ?? '') === 'DeviceNotRegistered' && isset($chunk[$i])) {
                query('DELETE FROM push_tokens WHERE token = ?', [$chunk[$i]]);
            }
        }
    }
    return $sent;
}

/** Téléphones des joueurs qui acceptent ce type d'alerte, près d'un point (ou partout si pas de point). */
function push_tokens_near(string $pref, ?float $lat, ?float $lng): array
{
    $sql = "SELECT t.token FROM push_tokens t JOIN users u ON u.id = t.user_id WHERE u.$pref = 1";
    $params = [];
    if ($lat !== null && $lng !== null) {
        [$dist, $box, $distParams, $boxParams] = geo_filter('t', $lat, $lng, PUSH_RADIUS_KM);
        $sql .= " AND $box AND $dist <= ?";
        $params = [...$boxParams, ...$distParams, PUSH_RADIUS_KM];
    }
    return array_column(query($sql, $params)->fetchAll(), 'token');
}

function push_tokens_of(array $userIds): array
{
    if (!$userIds) {
        return [];
    }
    $in = implode(',', array_fill(0, count($userIds), '?'));
    return array_column(query("SELECT token FROM push_tokens WHERE user_id IN ($in)", array_values($userIds))->fetchAll(), 'token');
}

/** Série de victoires en cours d'une équipe sur un terrain, et le match qui la porte. */
function venue_streak(int $teamId, int $venueId): array
{
    $n = 0;
    $last = null;
    foreach (team_results($teamId, $venueId) as $m) {
        $w = match_winner($m);
        if ($w === null) {
            continue;
        }
        if ($w !== $teamId) {
            break;
        }
        $last ??= (int)$m['id'];
        $n++;
    }
    return [$n, $last];
}

/** Envoie les alertes en attente : événements qui commencent, séries qui passent un palier. Sans risque de doublon. */
function run_notifications(): void
{
    try {
        foreach (query('SELECT * FROM bonus_events WHERE notified_at IS NULL AND starts_at <= UTC_TIMESTAMP() AND ends_at > UTC_TIMESTAMP()')->fetchAll() as $e) {
            if (query('UPDATE bonus_events SET notified_at = UTC_TIMESTAMP() WHERE id = ? AND notified_at IS NULL', [$e['id']])->rowCount() !== 1) {
                continue;
            }
            $venue = $e['venue_id'] !== null ? one('SELECT * FROM venues WHERE id = ?', [$e['venue_id']]) : null;
            $gain = array_filter([
                (int)$e['multiplier'] > 1 ? "points x{$e['multiplier']}" : null,
                (int)$e['bonus_points'] > 0 ? "+{$e['bonus_points']} pt" . ((int)$e['bonus_points'] > 1 ? 's' : '') . ' par match' : null,
            ]);
            push_send(
                push_tokens_near('notify_events', $venue ? (float)$venue['lat'] : null, $venue ? (float)$venue['lng'] : null),
                "⚡ {$e['title']}",
                ucfirst(implode(' et ', $gain)) . ($venue ? " à {$venue['name']}" : '') . ' jusqu\'au ' . fr_when($e['ends_at']) . '. Va jouer !',
                ['url' => '/']
            );
        }

        // Matchs au score validé récemment (y compris validés tout seuls au bout de 48 h).
        $recent = query(
            'SELECT * FROM matches WHERE score_status IN ("confirmed", "reported") AND status <> "cancelled"
               AND score_at > UTC_TIMESTAMP() - INTERVAL 7 DAY AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL'
        )->fetchAll();
        foreach ($recent as $m) {
            $winner = match_winner($m);
            if (!$winner) {
                continue;
            }
            [$n, $last] = venue_streak($winner, (int)$m['venue_id']);
            if ($last !== (int)$m['id'] || !streak_milestone($n)) {
                continue;
            }
            if (query('INSERT IGNORE INTO streak_alerts (match_id, team_id, streak) VALUES (?, ?, ?)', [$m['id'], $winner, $n])->rowCount() !== 1) {
                continue;
            }
            $team = load_team($winner);
            $venue = one('SELECT * FROM venues WHERE id = ?', [$m['venue_id']]);
            $members = array_map('intval', array_column(query('SELECT user_id FROM team_members WHERE team_id = ?', [$winner])->fetchAll(), 'user_id'));
            push_send(
                [...push_tokens_near('notify_streaks', (float)$venue['lat'], (float)$venue['lng']), ...push_tokens_of($members)],
                "🔥 {$team['name']} est en feu",
                "$n victoires d'affilée à {$venue['name']}. Qui va les arrêter ?",
                ['url' => "/team/$winner"]
            );
            notify($members, 'streak', "🔥 {$team['name']} est en feu", "$n victoires d'affilée à {$venue['name']}.", "/team/$winner", null, false);
        }
    } catch (Throwable $e) {
        // Une alerte ratée ne doit jamais faire échouer la requête du joueur.
        error_log('supercity push: ' . $e->getMessage());
    }
}

/** Prévient le capitaine adverse qu'un score l'attend. */
function notify_score_reported(array $m, int $byTeam): void
{
    try {
        $other = $byTeam === (int)$m['home_team_id'] ? (int)$m['away_team_id'] : (int)$m['home_team_id'];
        $by = load_team($byTeam);
        $m = load_match((int)$m['id']);
        $verb = $m['score_status'] === 'disputed' ? 'contestent le score et annoncent' : 'annoncent';
        notify(
            [(int)load_team($other)['captain_id']],
            'score',
            'Score à confirmer',
            "{$by['name']} $verb {$m['home_score']} - {$m['away_score']}. Confirme-le ou annonce le bon.",
            "/match/{$m['id']}"
        );
    } catch (Throwable $e) {
        error_log('supercity push: ' . $e->getMessage());
    }
}

function notification_prefs(array $u): array
{
    return [
        'events' => (bool)($u['notify_events'] ?? true),
        'streaks' => (bool)($u['notify_streaks'] ?? true),
        'friends' => (bool)($u['notify_friends'] ?? true),
    ];
}

function register_notification_routes(Router $r): void
{
    // Le téléphone s'inscrit (ou met à jour sa position approchée) après avoir accepté les notifications.
    $r->post('/me/push-token', function () {
        $user = require_user();
        $data = body();
        $in = validate($data)
            ->string('token', 10, 200)
            ->enum('platform', ['ios', 'android'])
            ->float('lat', -90, 90, false)
            ->float('lng', -180, 180, false)
            ->check();
        if (!preg_match(PUSH_TOKEN_PATTERN, $in['token'])) {
            throw new HttpError(422, 'validation_failed', 'Jeton de notification invalide.', ['token' => 'Jeton Expo attendu.']);
        }
        $lat = isset($in['lat'], $in['lng']) ? round($in['lat'], 2) : null;
        $lng = $lat !== null ? round($in['lng'], 2) : null;
        query(
            'INSERT INTO push_tokens (token, user_id, platform, lat, lng) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform),
               lat = COALESCE(VALUES(lat), lat), lng = COALESCE(VALUES(lng), lng), updated_at = CURRENT_TIMESTAMP',
            [$in['token'], $user['id'], $in['platform'], $lat, $lng]
        );
        respond(204);
    });

    // À la déconnexion : ce téléphone ne reçoit plus rien pour ce compte.
    $r->delete('/me/push-token', function () {
        $user = require_user();
        $in = validate(body())->string('token', 10, 200)->check();
        query('DELETE FROM push_tokens WHERE token = ? AND user_id = ?', [$in['token'], $user['id']]);
        respond(204);
    });

    $r->get('/me/notifications', function () {
        respond(200, notification_prefs(require_user()));
    });

    $r->patch('/me/notifications', function () {
        $user = require_user();
        $in = validate(body(), true)->bool('events', false)->bool('streaks', false)->bool('friends', false)->check();
        if (isset($in['friends'])) {
            query('UPDATE users SET notify_friends = ? WHERE id = ?', [(int)$in['friends'], $user['id']]);
        }
        if (isset($in['events'])) {
            query('UPDATE users SET notify_events = ? WHERE id = ?', [(int)$in['events'], $user['id']]);
        }
        if (isset($in['streaks'])) {
            query('UPDATE users SET notify_streaks = ? WHERE id = ?', [(int)$in['streaks'], $user['id']]);
        }
        respond(200, notification_prefs(one('SELECT * FROM users WHERE id = ?', [$user['id']])));
    });

    // Tâche planifiée Hostinger (toutes les 15 minutes) : envoie rappels et alertes même quand personne n'a l'appli ouverte.
    $r->get('/cron/notifications', function () {
        $key = config()['cron_key'] ?? '';
        if ($key === '' || !hash_equals($key, (string)($_GET['key'] ?? ''))) {
            forbidden('Clé de tâche planifiée invalide.');
        }
        run_background_jobs(true);
        respond(200, ['ok' => true]);
    });
}
