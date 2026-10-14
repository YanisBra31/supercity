<?php
// Cartes joueurs façon FUT : une note globale et six stats (vitesse, tir, passe, dribble, défense, physique).
// Le joueur s'estime en étoiles ; les votes de ceux qui ont joué avec lui remplacent peu à peu son estimation.
declare(strict_types=1);

const CARD_STATS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
// Poids de l'estimation du joueur, en nombre de votes : 3 votes pèsent autant que lui.
const CARD_SELF_WEIGHT = 3;
// En dessous, la carte reste marquée « estimation ».
const CARD_MIN_VOTES = 3;
// On peut noter les joueurs d'un match pendant 7 jours après la fin.
const RATING_WINDOW_DAYS = 7;
// Poids de chaque stat dans la note globale, selon le poste.
const CARD_WEIGHTS = [
    'attaquant' => ['pac' => .2, 'sho' => .3, 'pas' => .1, 'dri' => .25, 'def' => 0, 'phy' => .15],
    'milieu' => ['pac' => .15, 'sho' => .15, 'pas' => .3, 'dri' => .2, 'def' => .1, 'phy' => .1],
    'defenseur' => ['pac' => .15, 'sho' => 0, 'pas' => .15, 'dri' => .1, 'def' => .4, 'phy' => .2],
    'gardien' => ['pac' => .1, 'sho' => 0, 'pas' => .2, 'dri' => 0, 'def' => .4, 'phy' => .3],
];

/** 1 étoile = 40, 5 étoiles = 99. */
function stars_to_rating(float $stars): int
{
    return (int)round(40 + (max(1.0, min(5.0, $stars)) - 1) * 14.75);
}

/** Estimation du joueur, en étoiles ; à défaut, son niveau déclaré (ou 3) partout. */
function card_self(array $u): array
{
    $saved = $u['card_stats'] ? json_decode($u['card_stats'], true) : null;
    $base = $u['level'] !== null ? (int)$u['level'] : 3;
    $stats = [];
    foreach (CARD_STATS as $k) {
        $stats[$k] = isset($saved[$k]) ? (int)$saved[$k] : $base;
    }
    return [
        'stats' => $stats,
        'weak_foot' => $u['weak_foot'] !== null ? (int)$u['weak_foot'] : 2,
        'skill_moves' => $u['skill_moves'] !== null ? (int)$u['skill_moves'] : 2,
        'set' => $u['card_stats'] !== null,
    ];
}

function player_card(array $u, bool $withSelf = false): array
{
    $self = card_self($u);
    $votes = query('SELECT stars, best FROM player_ratings WHERE rated_id = ?', [$u['id']])->fetchAll();
    $n = count($votes);
    $stats = [];
    foreach (CARD_STATS as $k) {
        // Le point fort désigné compte une étoile de plus (jusqu'à 5).
        $sum = 0;
        foreach ($votes as $v) {
            $sum += min(5, (int)$v['stars'] + ($v['best'] === $k ? 1 : 0));
        }
        $stars = ($self['stats'][$k] * CARD_SELF_WEIGHT + $sum) / (CARD_SELF_WEIGHT + $n);
        $stats[$k] = stars_to_rating($stars);
    }
    $weights = CARD_WEIGHTS[$u['position'] ?? ''] ?? array_fill_keys(CARD_STATS, 1 / 6);
    $overall = 0.0;
    foreach ($weights as $k => $w) {
        $overall += $w * $stats[$k];
    }
    $card = [
        'overall' => (int)round($overall),
        'stats' => $stats,
        'weak_foot' => $self['weak_foot'],
        'skill_moves' => $self['skill_moves'],
        'votes' => $n,
        'estimated' => $n < CARD_MIN_VOTES,
    ];
    if ($withSelf) {
        $card['self'] = $self;
    }
    return $card;
}

/** Notes ouvertes : le match est fini depuis moins de 7 jours et le joueur y était inscrit. */
function rating_open(array $m, ?int $viewerId): bool
{
    if (!$viewerId || match_status($m) !== 'played') {
        return false;
    }
    $end = strtotime($m['starts_at'] . ' UTC') + 60 * (int)$m['duration_min'];
    if ($end < time() - RATING_WINDOW_DAYS * 86400) {
        return false;
    }
    return (bool)one('SELECT 1 AS x FROM match_participants WHERE match_id = ? AND user_id = ? AND status = "registered"', [$m['id'], $viewerId]);
}

/** Joueurs d'un match que le joueur peut noter, avec la note déjà donnée. */
function rating_players(int $matchId, int $viewerId): array
{
    $rows = query(
        'SELECT u.*, r.stars AS r_stars, r.best AS r_best FROM match_participants p JOIN users u ON u.id = p.user_id
         LEFT JOIN player_ratings r ON r.match_id = p.match_id AND r.rater_id = ? AND r.rated_id = u.id
         WHERE p.match_id = ? AND p.status = "registered" AND u.id <> ? ORDER BY u.display_name',
        [$viewerId, $matchId, $viewerId]
    )->fetchAll();
    return array_map(fn($u) => public_user($u) + [
        'stars' => $u['r_stars'] === null ? null : (int)$u['r_stars'],
        'best' => $u['r_best'],
    ], $rows);
}

function register_card_routes(Router $r): void
{
    // Estimation du joueur : { stats: { pac, sho, pas, dri, def, phy } en étoiles, weak_foot, skill_moves }.
    $r->patch('/me/card', function () {
        $user = require_user();
        $data = body();
        $v = validate($data, true)->int('weak_foot', 1, 5, false)->int('skill_moves', 1, 5, false);
        $stats = null;
        if (array_key_exists('stats', $data)) {
            $sv = validate(is_array($data['stats']) ? $data['stats'] : []);
            foreach (CARD_STATS as $k) {
                $sv->int($k, 1, 5);
            }
            if ($sv->errors) {
                $v->errors['stats'] = 'Chaque stat va de 1 à 5 étoiles.';
            }
            $stats = $sv->out;
        }
        $in = $v->check();
        if ($stats !== null) {
            $in['card_stats'] = json_encode($stats);
        }
        if ($in) {
            $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($in)));
            query("UPDATE users SET $sets WHERE id = ?", [...array_values($in), $user['id']]);
        }
        respond(200, player_card(one('SELECT * FROM users WHERE id = ?', [$user['id']]), true));
    });

    $r->get('/matches/(\d+)/ratings', function (string $id) {
        $user = require_user();
        $m = load_match((int)$id);
        if (!rating_open($m, (int)$user['id'])) {
            forbidden('Les notes sont ouvertes aux joueurs du match, pendant 7 jours après la fin.');
        }
        respond(200, ['players' => rating_players((int)$m['id'], (int)$user['id'])]);
    });

    // { ratings: [{ user_id, stars, best? }] } : on peut revenir sur sa note tant que c'est ouvert.
    $r->post('/matches/(\d+)/ratings', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $m = load_match((int)$id);
        if (!rating_open($m, $uid)) {
            forbidden('Les notes sont ouvertes aux joueurs du match, pendant 7 jours après la fin.');
        }
        $list = body()['ratings'] ?? null;
        if (!is_array($list) || !$list || count($list) > 50) {
            throw new HttpError(422, 'validation_failed', 'Aucune note à enregistrer.', ['ratings' => 'Liste de notes requise.']);
        }
        $allowed = array_map(fn($p) => $p['id'], rating_players((int)$m['id'], $uid));
        $rows = [];
        foreach ($list as $item) {
            $in = validate(is_array($item) ? $item : [])
                ->int('user_id', 1, PHP_INT_MAX)
                ->int('stars', 1, 5)
                ->enum('best', CARD_STATS, false)
                ->check();
            if (!in_array($in['user_id'], $allowed, true)) {
                throw new HttpError(422, 'validation_failed', "Tu ne peux noter que les autres joueurs du match.", ['ratings' => 'Joueur hors du match.']);
            }
            $rows[$in['user_id']] = $in;
        }
        transaction(function () use ($rows, $m, $uid) {
            foreach ($rows as $in) {
                query(
                    'INSERT INTO player_ratings (match_id, rater_id, rated_id, stars, best) VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE stars = VALUES(stars), best = VALUES(best)',
                    [$m['id'], $uid, $in['user_id'], $in['stars'], $in['best'] ?? null]
                );
            }
        });
        respond(200, ['players' => rating_players((int)$m['id'], $uid)]);
    });
}
