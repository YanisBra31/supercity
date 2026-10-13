<?php
// Boutique de cosmétiques (cadres de photo, bannières de profil, titres) payés en pièces.
// Les pièces se gagnent en jouant (10 par point de grade) ; les points de grade, eux, ne s'achètent jamais.
declare(strict_types=1);

const COINS_PER_POINT = 10;
const COSMETIC_TYPES = ['frame', 'banner', 'title'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const FRAME_EFFECTS = ['none', 'glow', 'spin'];
const BANNER_PATTERNS = ['none', 'stripes', 'dots', 'flames'];
const COSMETIC_SLOTS = ['frame' => 'frame_id', 'banner' => 'banner_id', 'title' => 'title_id'];
const SEASON_MAX_DAYS = 120;

/** Tout le catalogue, retiré compris (petite table), gardé le temps de la requête. */
function cosmetics_all(bool $fresh = false): array
{
    static $all = null;
    if ($all === null || $fresh) {
        $all = [];
        foreach (query('SELECT * FROM cosmetics ORDER BY FIELD(rarity, "common", "rare", "epic", "legendary"), price, id')->fetchAll() as $c) {
            $all[(int)$c['id']] = $c;
        }
    }
    return $all;
}

function cosmetic(int $id): ?array
{
    return cosmetics_all()[$id] ?? null;
}

/** Pièces : gagnées (points de grade) + journal (dépenses négatives, dons, achats). */
function coin_balance(int $userId): int
{
    $ledger = (int)one('SELECT COALESCE(SUM(amount), 0) AS n FROM coin_ledger WHERE user_id = ?', [$userId])['n'];
    return max(0, user_stats($userId)['points'] * COINS_PER_POINT + $ledger);
}

/** État d'un cosmétique en boutique : en vente, bientôt, terminé, retiré. */
function cosmetic_state(array $c): string
{
    if ((int)$c['retired'] === 1) {
        return 'retired';
    }
    if ($c['starts_at'] !== null && strtotime($c['starts_at'] . ' UTC') > time()) {
        return 'upcoming';
    }
    if ($c['ends_at'] !== null && strtotime($c['ends_at'] . ' UTC') <= time()) {
        return 'ended';
    }
    return 'on_sale';
}

/** Ce qu'il faut pour afficher un cosmétique équipé sur un profil. */
function cosmetic_brief(?int $id): ?array
{
    $c = $id ? cosmetic($id) : null;
    return $c ? ['id' => (int)$c['id'], 'type' => $c['type'], 'name' => $c['name'], 'rarity' => $c['rarity'], 'look' => json_decode($c['look'], true)] : null;
}

/** Cadre, bannière et titre portés par un joueur. */
function equipped_cosmetics(array $u): array
{
    $out = [];
    foreach (COSMETIC_SLOTS as $type => $col) {
        $out[$type] = cosmetic_brief(isset($u[$col]) ? (int)$u[$col] : null);
    }
    return $out;
}

function cosmetic_view(array $c, array $owned = [], array $equipped = [], int $level = 0): array
{
    $id = (int)$c['id'];
    return cosmetic_brief($id) + [
        'price' => (int)$c['price'],
        'min_level' => $c['min_level'] === null ? null : (int)$c['min_level'],
        'collection' => $c['collection'],
        'starts_at' => iso($c['starts_at']),
        'ends_at' => iso($c['ends_at']),
        'state' => cosmetic_state($c),
        'owned' => isset($owned[$id]),
        'equipped' => in_array($id, $equipped, true),
        'locked' => $c['min_level'] !== null && $level < (int)$c['min_level'],
    ];
}

/** La boutique telle que la voit un joueur : ce qui est en vente, et tout ce qu'il possède déjà. */
function shop_view(array $user): array
{
    $uid = (int)$user['id'];
    $u = one('SELECT * FROM users WHERE id = ?', [$uid]);
    $owned = array_flip(array_map('intval', array_column(query('SELECT cosmetic_id FROM user_cosmetics WHERE user_id = ?', [$uid])->fetchAll(), 'cosmetic_id')));
    $equipped = array_values(array_filter(array_map(fn($col) => $u[$col] === null ? null : (int)$u[$col], COSMETIC_SLOTS)));
    $level = grade_for(user_stats($uid))['level'];
    $items = [];
    foreach (cosmetics_all() as $id => $c) {
        if (cosmetic_state($c) === 'on_sale' || isset($owned[$id])) {
            $items[] = cosmetic_view($c, $owned, $equipped, $level);
        }
    }
    return [
        'coins' => coin_balance($uid),
        'coins_per_point' => COINS_PER_POINT,
        'equipped' => equipped_cosmetics($u),
        'items' => $items,
    ];
}

/** Apparence envoyée par la modération : seulement des couleurs, et l'effet ou le motif prévu pour ce type. */
function cosmetic_look(string $type, array $data): array
{
    $colors = $data['colors'] ?? null;
    if (!is_array($colors) || count($colors) < 2 || count($colors) > 3) {
        throw new HttpError(422, 'validation_failed', 'Choisis deux ou trois couleurs.', ['colors' => 'Deux ou trois couleurs.']);
    }
    $look = ['colors' => []];
    foreach (array_values($colors) as $col) {
        if (!is_string($col) || !preg_match('/^#[0-9a-fA-F]{6}$/', $col)) {
            throw new HttpError(422, 'validation_failed', 'Couleur invalide.', ['colors' => 'Format #rrggbb attendu.']);
        }
        $look['colors'][] = strtolower($col);
    }
    if ($type === 'frame') {
        $look['effect'] = in_array($data['effect'] ?? 'none', FRAME_EFFECTS, true) ? ($data['effect'] ?? 'none') : 'none';
    } elseif ($type === 'banner') {
        $look['pattern'] = in_array($data['pattern'] ?? 'none', BANNER_PATTERNS, true) ? ($data['pattern'] ?? 'none') : 'none';
    }
    return $look;
}

function register_shop_routes(Router $r): void
{
    $r->get('/shop', function () {
        respond(200, shop_view(require_user()));
    });

    // Achat (ou déblocage gratuit d'une pièce de grade). Une seule fois par joueur, jamais à découvert.
    $r->post('/shop/(\d+)/buy', function (string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        $c = cosmetic((int)$id) ?? not_found('Cosmétique');
        if (cosmetic_state($c) !== 'on_sale') {
            throw new HttpError(409, 'not_on_sale', "Ce cosmétique n'est plus en vente.");
        }
        if ($c['min_level'] !== null && grade_for(user_stats($uid))['level'] < (int)$c['min_level']) {
            $label = GRADES[(int)$c['min_level'] - 1]['label'] ?? '';
            throw new HttpError(403, 'grade_required', "Réservé aux joueurs de grade $label et plus.");
        }
        $db = db();
        $db->beginTransaction();
        try {
            // Verrou sur le joueur : deux achats en même temps ne peuvent pas dépenser les mêmes pièces.
            query('SELECT id FROM users WHERE id = ? FOR UPDATE', [$uid]);
            if (one('SELECT 1 AS x FROM user_cosmetics WHERE user_id = ? AND cosmetic_id = ?', [$uid, $c['id']])) {
                throw new HttpError(409, 'already_owned', 'Tu as déjà ce cosmétique.');
            }
            $price = (int)$c['price'];
            if (coin_balance($uid) < $price) {
                throw new HttpError(402, 'not_enough_coins', "Il te manque des pièces. Joue des matchs pour en gagner.");
            }
            query('INSERT INTO user_cosmetics (user_id, cosmetic_id) VALUES (?, ?)', [$uid, $c['id']]);
            if ($price > 0) {
                query('INSERT INTO coin_ledger (user_id, amount, reason, cosmetic_id) VALUES (?, ?, "purchase", ?)', [$uid, -$price, $c['id']]);
            }
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
        respond(200, shop_view($user));
    });

    // Équiper ou retirer : { frame, banner, title }, chacun un id possédé ou null.
    $r->patch('/me/cosmetics', function () {
        $user = require_user();
        $in = validate(body(), true)
            ->int('frame', 1, PHP_INT_MAX, false)
            ->int('banner', 1, PHP_INT_MAX, false)
            ->int('title', 1, PHP_INT_MAX, false)
            ->check();
        foreach (COSMETIC_SLOTS as $type => $col) {
            if (!array_key_exists($type, $in)) {
                continue;
            }
            $cid = $in[$type];
            if ($cid !== null) {
                $c = cosmetic($cid);
                $mine = one('SELECT 1 AS x FROM user_cosmetics WHERE user_id = ? AND cosmetic_id = ?', [$user['id'], $cid]);
                if (!$c || !$mine || $c['type'] !== $type) {
                    throw new HttpError(422, 'validation_failed', "Tu ne possèdes pas ce cosmétique.", [$type => 'Cosmétique non possédé.']);
                }
            }
            query("UPDATE users SET $col = ? WHERE id = ?", [$cid, $user['id']]);
        }
        respond(200, shop_view($user));
    });

    // Modération : tout le catalogue, avec le nombre de joueurs qui possèdent chaque pièce.
    $r->get('/mod/cosmetics', function () {
        require_role('moderator');
        $counts = [];
        foreach (query('SELECT cosmetic_id, COUNT(*) AS n FROM user_cosmetics GROUP BY cosmetic_id')->fetchAll() as $row) {
            $counts[(int)$row['cosmetic_id']] = (int)$row['n'];
        }
        $items = array_map(fn($c) => cosmetic_view($c) + ['owners' => $counts[(int)$c['id']] ?? 0], array_values(cosmetics_all()));
        respond(200, ['items' => $items]);
    });

    // Nouveau cosmétique, permanent ou dans une collection saisonnière (avec dates).
    $r->post('/mod/cosmetics', function () {
        $mod = require_role('moderator');
        $data = body();
        $in = validate($data)
            ->enum('type', COSMETIC_TYPES)
            ->string('name', 2, 40)
            ->enum('rarity', RARITIES)
            ->int('price', 0, 100000)
            ->int('min_level', 1, count(GRADES), false)
            ->string('collection', 2, 40, false)
            ->datetime('starts_at', false)
            ->datetime('ends_at', false)
            ->check();
        $look = cosmetic_look($in['type'], is_array($data['look'] ?? null) ? $data['look'] : []);
        $start = isset($in['starts_at']) ? strtotime($in['starts_at'] . ' UTC') : time();
        if (isset($in['ends_at'])) {
            $end = strtotime($in['ends_at'] . ' UTC');
            if ($end <= $start || $end <= time()) {
                throw new HttpError(422, 'validation_failed', 'La fin doit être après le début, et à venir.', ['ends_at' => 'Date de fin invalide.']);
            }
            if ($end - $start > SEASON_MAX_DAYS * 86400) {
                throw new HttpError(422, 'validation_failed', 'Une saison dure ' . SEASON_MAX_DAYS . ' jours au plus.', ['ends_at' => 'Trop long.']);
            }
        }
        query(
            'INSERT INTO cosmetics (type, name, rarity, price, look, min_level, collection, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$in['type'], $in['name'], $in['rarity'], $in['price'], json_encode($look), $in['min_level'] ?? null, $in['collection'] ?? null, $in['starts_at'] ?? null, $in['ends_at'] ?? null, $mod['id']]
        );
        $id = (int)db()->lastInsertId();
        respond(201, cosmetic_view(cosmetics_all(true)[$id]) + ['owners' => 0]);
    });

    // Retirer de la vente : ceux qui l'ont déjà le gardent.
    $r->delete('/mod/cosmetics/(\d+)', function (string $id) {
        require_role('moderator');
        $c = cosmetic((int)$id) ?? not_found('Cosmétique');
        query('UPDATE cosmetics SET retired = 1 WHERE id = ?', [$c['id']]);
        respond(204);
    });

    // Admin : offrir (ou reprendre) des pièces, par exemple pour récompenser un tournoi.
    $r->post('/admin/users/(\d+)/coins', function (string $id) {
        require_role('admin');
        $target = one('SELECT id FROM users WHERE id = ?', [(int)$id]) ?? not_found('Joueur');
        $in = validate(body())->int('amount', -100000, 100000)->check();
        if ($in['amount'] === 0) {
            throw new HttpError(422, 'validation_failed', 'Montant nul.', ['amount' => 'Montant non nul attendu.']);
        }
        query('INSERT INTO coin_ledger (user_id, amount, reason) VALUES (?, ?, "grant")', [$target['id'], $in['amount']]);
        respond(200, ['coins' => coin_balance((int)$target['id'])]);
    });
}
