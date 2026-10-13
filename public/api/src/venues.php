<?php
// Terrains : ajout par les joueurs et recherche autour d'un point.
declare(strict_types=1);

const SURFACES = ['city', 'synthetique', 'herbe', 'parquet', 'autre'];

/**
 * Filtre « autour de moi » : boîte englobante (rapide, utilise l'index) puis distance exacte (haversine, en km).
 * Renvoie [expression SQL de distance, clause WHERE, paramètres]. $alias = table qui porte lat/lng.
 */
function geo_filter(string $alias, float $lat, float $lng, float $radiusKm): array
{
    $dLat = $radiusKm / 111.045;
    $dLng = $radiusKm / (111.045 * max(0.01, cos(deg2rad($lat))));
    $distance = "(6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS($alias.lat)) * COS(RADIANS($alias.lng) - RADIANS(?))
                 + SIN(RADIANS(?)) * SIN(RADIANS($alias.lat)))))";
    return [
        $distance,
        "$alias.lat BETWEEN ? AND ? AND $alias.lng BETWEEN ? AND ?",
        [$lat, $lng, $lat],
        [$lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng],
    ];
}

/** Lit ?lat=&lng=&radius_km= ; renvoie null si pas de position. */
function geo_params(float $defaultRadius = 10): ?array
{
    if (!isset($_GET['lat'], $_GET['lng'])) {
        return null;
    }
    $in = validate($_GET)
        ->float('lat', -90, 90)
        ->float('lng', -180, 180)
        ->float('radius_km', 0.1, 200, false)
        ->check();
    return [$in['lat'], $in['lng'], $in['radius_km'] ?? $defaultRadius];
}

function venue_view(array $v): array
{
    return [
        'id' => (int)$v['id'],
        'name' => $v['name'],
        'address' => $v['address'],
        'city' => $v['city'],
        'lat' => (float)$v['lat'],
        'lng' => (float)$v['lng'],
        'surface' => $v['surface'],
        'covered' => (bool)$v['covered'],
        'distance_km' => isset($v['distance_km']) ? round((float)$v['distance_km'], 2) : null,
    ];
}

function register_venue_routes(Router $r): void
{
    $r->post('/venues', function () {
        $user = require_user();
        $in = validate(body())
            ->string('name', 2, 100)
            ->string('address', 5, 255)
            ->string('city', 1, 80, false)
            ->float('lat', -90, 90)
            ->float('lng', -180, 180)
            ->enum('surface', SURFACES, false)
            ->bool('covered', false)
            ->check();
        query(
            'INSERT INTO venues (name, address, city, lat, lng, surface, covered, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$in['name'], $in['address'], $in['city'] ?? null, $in['lat'], $in['lng'], $in['surface'] ?? 'autre', $in['covered'] ?? 0, $user['id']]
        );
        respond(201, venue_view(one('SELECT * FROM venues WHERE id = ?', [(int)db()->lastInsertId()])));
    });

    // ?lat=&lng=&radius_km= (triés par distance) et/ou ?q= (nom ou adresse).
    $r->get('/venues', function () {
        require_user();
        [$limit, $offset] = paging();
        $select = 'v.*';
        $where = [];
        $params = [];
        $order = 'v.name';
        if ($geo = geo_params()) {
            [$dist, $box, $distParams, $boxParams] = geo_filter('v', ...$geo);
            $select .= ", $dist AS distance_km";
            $params = [...$distParams, ...$boxParams, ...$distParams, $geo[2]];
            $where[] = $box;
            $where[] = "$dist <= ?";
            $order = 'distance_km';
        }
        if (($q = trim((string)($_GET['q'] ?? ''))) !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $where[] = '(v.name LIKE ? OR v.address LIKE ?)';
            array_push($params, $like, $like);
        }
        $sql = "SELECT $select FROM venues v" . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . " ORDER BY $order LIMIT $limit OFFSET $offset";
        respond(200, ['items' => array_map('venue_view', query($sql, $params)->fetchAll())]);
    });

    $r->get('/venues/(\d+)', function (string $id) {
        require_user();
        $v = one('SELECT * FROM venues WHERE id = ?', [(int)$id]) ?? not_found('Terrain');
        respond(200, venue_view($v) + ['king' => venue_king((int)$v['id'])]);
    });
}
