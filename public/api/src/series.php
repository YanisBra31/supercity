<?php
// Scores des matchs entre équipes, séries de victoires (les flammes) et événements bonus de la modération.
declare(strict_types=1);

// Un score annoncé par un capitaine compte tout seul si l'autre équipe ne l'a ni confirmé ni contesté entre-temps.
const SCORE_AUTO_CONFIRM_HOURS = 48;
// Points de grade : une victoire rapporte en plus du match joué.
const WIN_POINTS = 2;
// À partir de combien de victoires d'affilée une équipe est « en feu ».
const ON_FIRE_STREAK = 3;
const EVENT_MAX_DAYS = 31;

/** Statut du score tel qu'on l'affiche : un score annoncé depuis longtemps sans contestation vaut confirmé. */
function score_status(array $m): ?string
{
    $s = $m['score_status'] ?? null;
    if ($s === 'reported' && strtotime($m['score_at'] . ' UTC') < time() - SCORE_AUTO_CONFIRM_HOURS * 3600) {
        return 'confirmed';
    }
    return $s;
}

/** Équipe gagnante d'un match au score validé (0 pour un nul, null si pas de résultat). */
function match_winner(array $m): ?int
{
    if ($m['status'] === 'cancelled' || score_status($m) !== 'confirmed') {
        return null;
    }
    $h = (int)$m['home_score'];
    $a = (int)$m['away_score'];
    return $h === $a ? 0 : (int)($h > $a ? $m['home_team_id'] : $m['away_team_id']);
}

/** Matchs avec un score (validé ou non) d'une équipe, du plus récent au plus ancien. */
function team_results(int $teamId, ?int $venueId = null): array
{
    $sql = 'SELECT * FROM matches WHERE (home_team_id = ? OR away_team_id = ?) AND score_status IS NOT NULL AND status <> "cancelled"';
    $params = [$teamId, $teamId];
    if ($venueId !== null) {
        $sql .= ' AND venue_id = ?';
        $params[] = $venueId;
    }
    return query($sql . ' ORDER BY starts_at DESC LIMIT 200', $params)->fetchAll();
}

/** Série en cours, meilleure série et forme sur les 5 derniers matchs (V, N, D). */
function team_streak(int $teamId): array
{
    static $cache = [];
    if (isset($cache[$teamId])) {
        return $cache[$teamId];
    }
    $current = $run = $best = 0;
    $broken = false;
    $form = [];
    foreach (team_results($teamId) as $m) {
        $w = match_winner($m);
        if ($w === null) {
            continue;
        }
        if (count($form) < 5) {
            $form[] = $w === $teamId ? 'W' : ($w === 0 ? 'D' : 'L');
        }
        if ($w === $teamId) {
            $run++;
            $best = max($best, $run);
            if (!$broken) {
                $current = $run;
            }
        } else {
            $run = 0;
            $broken = true;
        }
    }
    return $cache[$teamId] = ['current' => $current, 'best' => $best, 'on_fire' => $current >= ON_FIRE_STREAK, 'form' => $form];
}

/** Roi du terrain : l'équipe qui a la plus longue série de victoires en cours sur ce terrain (2 au moins). */
function venue_king(int $venueId): ?array
{
    $rows = query(
        'SELECT * FROM matches WHERE venue_id = ? AND score_status IS NOT NULL AND status <> "cancelled" ORDER BY starts_at DESC LIMIT 300',
        [$venueId]
    )->fetchAll();
    $streak = $done = [];
    foreach ($rows as $m) {
        $w = match_winner($m);
        if ($w === null) {
            continue;
        }
        foreach ([(int)$m['home_team_id'], (int)$m['away_team_id']] as $t) {
            if (isset($done[$t])) {
                continue;
            }
            if ($w === $t) {
                $streak[$t] = ($streak[$t] ?? 0) + 1;
            } else {
                $done[$t] = true;
            }
        }
    }
    arsort($streak);
    $team = array_key_first($streak);
    if ($team === null || $streak[$team] < 2) {
        return null;
    }
    return ['team' => team_brief($team), 'streak' => $streak[$team], 'on_fire' => $streak[$team] >= ON_FIRE_STREAK];
}

/** Ce que voit le joueur du score d'un match entre deux équipes, avec ce qu'il peut y faire. */
function score_view(array $m, ?int $viewerId): ?array
{
    if ($m['home_team_id'] === null || $m['away_team_id'] === null || $m['status'] === 'cancelled') {
        return null;
    }
    $captainOf = null;
    if ($viewerId !== null) {
        foreach ([(int)$m['home_team_id'], (int)$m['away_team_id']] as $t) {
            if ((int)load_team($t)['captain_id'] === $viewerId) {
                $captainOf = $t;
            }
        }
    }
    $status = score_status($m);
    $open = match_status($m) === 'played' && $status !== 'confirmed';
    return [
        'home' => $m['home_score'] === null ? null : (int)$m['home_score'],
        'away' => $m['away_score'] === null ? null : (int)$m['away_score'],
        'status' => $status,
        'reported_by_team_id' => $m['score_team_id'] === null ? null : (int)$m['score_team_id'],
        'winner_team_id' => match_winner($m),
        'can_report' => $open && $captainOf !== null,
        'can_confirm' => $open && $status === 'reported' && $captainOf !== null && $captainOf !== (int)$m['score_team_id'],
    ];
}

/** Événements bonus qui chevauchent une période (tous, pour le calcul des points d'une requête). */
function bonus_events(): array
{
    static $all = null;
    return $all ??= query('SELECT * FROM bonus_events ORDER BY starts_at')->fetchAll();
}

/** Meilleur événement bonus qui couvre ce match (sa date de début, et son terrain s'il en vise un). */
function match_bonus(array $m): ?array
{
    $best = null;
    foreach (bonus_events() as $e) {
        if ($m['starts_at'] < $e['starts_at'] || $m['starts_at'] >= $e['ends_at']) {
            continue;
        }
        if ($e['venue_id'] !== null && (int)$e['venue_id'] !== (int)$m['venue_id']) {
            continue;
        }
        $gain = fn($x) => 3 * (int)$x['multiplier'] + (int)$x['bonus_points'];
        if ($best === null || $gain($e) > $gain($best)) {
            $best = $e;
        }
    }
    return $best;
}

function bonus_event_view(array $e): array
{
    $venue = $e['venue_id'] !== null ? one('SELECT * FROM venues WHERE id = ?', [$e['venue_id']]) : null;
    return [
        'id' => (int)$e['id'],
        'title' => $e['title'],
        'description' => $e['description'],
        'multiplier' => (int)$e['multiplier'],
        'bonus_points' => (int)$e['bonus_points'],
        'venue' => $venue ? venue_view($venue) : null,
        'starts_at' => iso($e['starts_at']),
        'ends_at' => iso($e['ends_at']),
        'active' => strtotime($e['starts_at'] . ' UTC') <= time() && strtotime($e['ends_at'] . ' UTC') > time(),
    ];
}

/**
 * Points d'un match joué : 1, plus WIN_POINTS si l'équipe du joueur l'a gagné,
 * le tout multiplié pendant un événement bonus, qui peut aussi ajouter des points fixes.
 */
function match_points(array $m, ?int $teamId): array
{
    $won = $teamId !== null && match_winner($m) === $teamId;
    $points = 1 + ($won ? WIN_POINTS : 0);
    if ($e = match_bonus($m)) {
        $points = $points * (int)$e['multiplier'] + (int)$e['bonus_points'];
    }
    return [$points, $won];
}

/** Enregistre un score annoncé par un capitaine : identique à celui de l'autre équipe, il est confirmé ; différent, il est contesté. */
function report_score(array $m, int $teamId, int $home, int $away): void
{
    $status = 'reported';
    if (in_array($m['score_status'], ['reported', 'disputed'], true) && (int)$m['score_team_id'] !== $teamId) {
        $status = (int)$m['home_score'] === $home && (int)$m['away_score'] === $away ? 'confirmed' : 'disputed';
    }
    query(
        'UPDATE matches SET home_score = ?, away_score = ?, score_status = ?, score_team_id = ?, score_at = UTC_TIMESTAMP() WHERE id = ?',
        [$home, $away, $status, $teamId, $m['id']]
    );
}

function register_series_routes(Router $r): void
{
    // Un capitaine annonce le score après le match ; l'autre capitaine le confirme ou en annonce un autre.
    $r->post('/matches/(\d+)/score', function (string $id) {
        $user = require_user();
        $in = validate(body())->int('home_score', 0, 99)->int('away_score', 0, 99)->check();
        transaction(function () use ($id, $user, $in) {
            $m = load_match((int)$id, true);
            $view = score_view($m, (int)$user['id']);
            if ($view === null) {
                throw new HttpError(409, 'not_a_team_match', 'Le score se donne sur un match entre deux équipes.');
            }
            if (!$view['can_report']) {
                if (score_status($m) === 'confirmed') {
                    throw new HttpError(409, 'score_locked', 'Le score est déjà validé. Pour le corriger, contacte la modération.');
                }
                if (match_status($m) !== 'played') {
                    throw new HttpError(409, 'match_not_played', 'Le score se donne une fois le match terminé.');
                }
                forbidden('Seuls les capitaines des deux équipes donnent le score.');
            }
            $team = (int)load_team((int)$m['home_team_id'])['captain_id'] === (int)$user['id'] ? (int)$m['home_team_id'] : (int)$m['away_team_id'];
            report_score($m, $team, $in['home_score'], $in['away_score']);
        });
        $m = load_match((int)$id);
        if ($m['score_status'] === 'confirmed') {
            run_notifications();
        } else {
            notify_score_reported($m, (int)$m['score_team_id']);
        }
        respond(200, match_view($m, (int)$user['id'], true));
    });

    $r->post('/matches/(\d+)/score/confirm', function (string $id) {
        $user = require_user();
        transaction(function () use ($id, $user) {
            $m = load_match((int)$id, true);
            $view = score_view($m, (int)$user['id']);
            if (!($view['can_confirm'] ?? false)) {
                throw new HttpError(409, 'cannot_confirm', 'Rien à confirmer : seul le capitaine de l\'autre équipe confirme un score annoncé.');
            }
            query('UPDATE matches SET score_status = "confirmed", score_at = UTC_TIMESTAMP() WHERE id = ?', [$m['id']]);
        });
        run_notifications();
        respond(200, match_view(load_match((int)$id), (int)$user['id'], true));
    });

    // La modération tranche un score contesté (ou le corrige), ou l'efface.
    $r->post('/mod/matches/(\d+)/score', function (string $id) {
        $mod = require_role('moderator');
        $in = validate(body())->int('home_score', 0, 99)->int('away_score', 0, 99)->check();
        $m = load_match((int)$id);
        if (score_view($m, null) === null) {
            throw new HttpError(409, 'not_a_team_match', 'Le score se donne sur un match entre deux équipes.');
        }
        query(
            'UPDATE matches SET home_score = ?, away_score = ?, score_status = "confirmed", score_team_id = NULL, score_at = UTC_TIMESTAMP() WHERE id = ?',
            [$in['home_score'], $in['away_score'], $m['id']]
        );
        run_notifications();
        respond(200, match_view(load_match((int)$id), (int)$mod['id'], true));
    });

    $r->delete('/mod/matches/(\d+)/score', function (string $id) {
        $mod = require_role('moderator');
        $m = load_match((int)$id);
        query('UPDATE matches SET home_score = NULL, away_score = NULL, score_status = NULL, score_team_id = NULL, score_at = NULL WHERE id = ?', [$m['id']]);
        respond(200, match_view(load_match((int)$id), (int)$mod['id'], true));
    });

    // Scores contestés, à trancher par la modération.
    $r->get('/mod/disputes', function () {
        $mod = require_role('moderator');
        $rows = query('SELECT * FROM matches WHERE score_status = "disputed" AND status <> "cancelled" ORDER BY score_at DESC LIMIT 100')->fetchAll();
        respond(200, ['items' => array_map(fn($m) => match_view($m, (int)$mod['id']), $rows)]);
    });

    $r->get('/teams/(\d+)/results', function (string $id) {
        $user = require_user();
        $t = load_team((int)$id);
        $rows = array_slice(array_filter(team_results((int)$t['id']), fn($m) => match_winner($m) !== null), 0, 20);
        respond(200, ['streak' => team_streak((int)$t['id']), 'items' => array_map(fn($m) => match_view($m, (int)$user['id']), $rows)]);
    });

    // Événements bonus en cours et à venir, pour tout le monde.
    $r->get('/bonus-events', function () {
        require_user();
        // L'accueil de l'appli passe ici : on en profite pour envoyer les alertes en attente.
        run_notifications();
        $rows = query('SELECT * FROM bonus_events WHERE ends_at > UTC_TIMESTAMP() ORDER BY starts_at LIMIT 50')->fetchAll();
        respond(200, ['items' => array_map('bonus_event_view', $rows)]);
    });

    $r->post('/mod/bonus-events', function () {
        $mod = require_role('moderator');
        $in = validate(body())
            ->string('title', 3, 60)
            ->string('description', 1, 300, false)
            ->int('multiplier', 1, 5)
            ->int('bonus_points', 0, 50, false)
            ->datetime('starts_at')
            ->datetime('ends_at')
            ->int('venue_id', 1, PHP_INT_MAX, false)
            ->check();
        $bonus = $in['bonus_points'] ?? 0;
        if ($in['multiplier'] === 1 && $bonus === 0) {
            throw new HttpError(422, 'validation_failed', "L'événement doit rapporter quelque chose.", ['multiplier' => 'Choisis un multiplicateur ou des points bonus.']);
        }
        $start = strtotime($in['starts_at'] . ' UTC');
        $end = strtotime($in['ends_at'] . ' UTC');
        if ($end <= $start || $end <= time()) {
            throw new HttpError(422, 'validation_failed', 'La fin doit être après le début, et à venir.', ['ends_at' => 'Date de fin invalide.']);
        }
        if ($end - $start > EVENT_MAX_DAYS * 86400) {
            throw new HttpError(422, 'validation_failed', 'Un événement dure ' . EVENT_MAX_DAYS . ' jours au plus.', ['ends_at' => 'Trop long.']);
        }
        if (isset($in['venue_id'])) {
            one('SELECT id FROM venues WHERE id = ?', [$in['venue_id']]) ?? not_found('Terrain');
        }
        query(
            'INSERT INTO bonus_events (title, description, venue_id, multiplier, bonus_points, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$in['title'], $in['description'] ?? null, $in['venue_id'] ?? null, $in['multiplier'], $bonus, $in['starts_at'], $in['ends_at'], $mod['id']]
        );
        $id = (int)db()->lastInsertId();
        run_notifications();
        respond(201, bonus_event_view(one('SELECT * FROM bonus_events WHERE id = ?', [$id])));
    });

    $r->delete('/mod/bonus-events/(\d+)', function (string $id) {
        require_role('moderator');
        $e = one('SELECT id FROM bonus_events WHERE id = ?', [(int)$id]) ?? not_found('Événement');
        query('DELETE FROM bonus_events WHERE id = ?', [$e['id']]);
        respond(204);
    });
}
