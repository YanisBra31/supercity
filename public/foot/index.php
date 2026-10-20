<?php
// Pages publiques pour les moteurs de recherche : /foot/ (les villes), /foot/<ville>/ (terrains et matchs à venir),
// /foot/sitemap.xml. Générées à chaque visite depuis la base de l'appli : rien à reconstruire quand un terrain s'ajoute.
// Aucune donnée personnelle : seulement les terrains et les matchs publics, sans le nom des joueurs.
declare(strict_types=1);

require __DIR__ . '/../api/src/lib.php';

date_default_timezone_set('UTC');
const SITE = 'https://supercity.fr';
const FORMAT_LABELS = ['city5' => 'City à 5', 'futsal' => 'Futsal', 'foot8' => 'Foot à 8', 'foot11' => 'Foot à 11'];
const SURFACE_LABELS = ['city' => 'City stade', 'synthetique' => 'Synthétique', 'herbe' => 'Herbe', 'parquet' => 'Parquet (salle)', 'autre' => 'Terrain'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function h(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function slugify(string $s): string
{
    $s = function_exists('transliterator_transliterate')
        ? (transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $s) ?: $s)
        : strtolower((string)iconv('UTF-8', 'ASCII//TRANSLIT', $s));
    return trim(preg_replace('/[^a-z0-9]+/', '-', $s), '-');
}

/** Ville du terrain : le champ « ville », sinon la fin de l'adresse (« …, 31100 Toulouse »). */
function venue_city(array $v): ?string
{
    $city = trim((string)($v['city'] ?? ''));
    if ($city === '' && preg_match('/\b\d{5}\s+([^,\d][^,]*)$/u', trim((string)$v['address']), $m)) {
        $city = trim($m[1]);
    }
    if ($city === '') {
        return null;
    }
    // « TOULOUSE » ou « toulouse » → « Toulouse ».
    return mb_convert_case(mb_strtolower($city), MB_CASE_TITLE, 'UTF-8');
}

/** Toutes les villes qui ont au moins un terrain : [slug => ['name', 'venues' => [...]]]. */
function cities(): array
{
    $out = [];
    foreach (query('SELECT * FROM venues ORDER BY name')->fetchAll() as $v) {
        if (!($name = venue_city($v))) {
            continue;
        }
        $slug = slugify($name);
        $out[$slug] ??= ['name' => $name, 'venues' => []];
        $out[$slug]['venues'][] = $v;
    }
    uasort($out, fn($a, $b) => count($b['venues']) <=> count($a['venues']) ?: strcmp($a['name'], $b['name']));
    return $out;
}

/** Matchs publics à venir sur ces terrains, avec le nombre d'inscrits. */
function upcoming(array $venueIds): array
{
    if (!$venueIds) {
        return [];
    }
    $in = implode(',', array_fill(0, count($venueIds), '?'));
    return query(
        "SELECT m.*, v.name AS venue_name, v.address AS venue_address,
                (SELECT COUNT(*) FROM match_participants p WHERE p.match_id = m.id AND p.status IN ('registered', 'pending')) AS players
         FROM matches m JOIN venues v ON v.id = m.venue_id
         WHERE m.venue_id IN ($in) AND m.visibility = 'public' AND m.status <> 'cancelled' AND m.starts_at >= UTC_TIMESTAMP()
         ORDER BY m.starts_at LIMIT 30",
        $venueIds
    )->fetchAll();
}

function when(string $utc): string
{
    $d = new DateTime($utc . ' UTC');
    $d->setTimezone(new DateTimeZone('Europe/Paris'));
    return DAYS[(int)$d->format('w')] . ' ' . $d->format('j') . ' ' . MONTHS[(int)$d->format('n') - 1] . ' · ' . $d->format('G\hi');
}

function page(string $title, string $description, string $canonical, string $body, array $jsonLd = []): never
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    $ld = $jsonLd ? '<script type="application/ld+json">' . json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' : '';
    $ads = '';
    // Copie de ads.config.json, faite à la construction du site (npm run build).
    $cfg = json_decode((string)@file_get_contents(__DIR__ . '/ads.json'), true);
    if (is_array($cfg) && str_starts_with((string)($cfg['client'] ?? ''), 'ca-pub-')) {
        $ads = '<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' . h($cfg['client']) . '"></script>';
    }
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>' . h($title) . '</title><meta name="description" content="' . h($description) . '">'
        . '<link rel="canonical" href="' . h(SITE . $canonical) . '"><meta name="theme-color" content="#ff5223">'
        . '<meta property="og:type" content="website"><meta property="og:site_name" content="Supercity"><meta property="og:locale" content="fr_FR">'
        . '<meta property="og:title" content="' . h($title) . '"><meta property="og:description" content="' . h($description) . '">'
        . '<meta property="og:url" content="' . h(SITE . $canonical) . '"><meta property="og:image" content="' . SITE . '/affiche.jpg">'
        . '<link rel="icon" href="/icon.png">' . $ads . $ld . '<style>' . CSS . '</style></head><body>'
        . '<header class="top"><a href="/decouvrir/" class="brand"><img src="/logo-blanc.png" alt="" width="26" height="32">Supercity</a>'
        . '<a href="/app/" class="btn">Ouvrir l\'appli</a></header><main>' . $body . '</main>'
        . '<footer><a href="/foot/">Toutes les villes</a><a href="/decouvrir/">Découvrir Supercity</a><a href="/mentions-legales/">Mentions légales</a>'
        . '<a href="/confidentialite/">Confidentialité</a><span>© Supercity ' . date('Y') . '</span></footer></body></html>';
    exit;
}

function not_found_page(): never
{
    http_response_code(404);
    page('Ville introuvable · Supercity', "Cette ville n'a pas encore de terrain sur Supercity.", '/foot/',
        '<h1>Pas encore de terrain ici</h1><p class="lead">Cette ville n\'a pas encore de terrain sur Supercity. Ajoute le tien depuis l\'appli, il apparaîtra ici.</p>'
        . '<p><a class="btn" href="/app/venue/new">Ajouter un terrain</a> <a class="link" href="/foot/">Voir les villes</a></p>');
}

const CSS = <<<'CSS'
:root{--orange:#ff5223;--orange1:#ff9417;--night:#0f0c0b;--card:#1d1816;--chalk:#fff8f1;--dim:rgba(255,248,241,.65);--line:rgba(255,248,241,.12)}
*{box-sizing:border-box}body{margin:0;background:var(--night);color:var(--chalk);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--orange1)}main{max-width:880px;margin:0 auto;padding:24px 16px 48px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:880px;margin:0 auto;padding:16px}
.brand{display:flex;align-items:center;gap:10px;color:var(--chalk);font-weight:800;font-size:20px;text-decoration:none}
.btn{display:inline-block;background:linear-gradient(135deg,var(--orange1),var(--orange));color:#fff;font-weight:700;padding:10px 18px;border-radius:999px;text-decoration:none}
.link{margin-left:12px}h1{font-size:clamp(30px,6vw,46px);line-height:1.1;letter-spacing:-1px;margin:16px 0 12px}h1 span{color:var(--orange1)}
h2{font-size:22px;margin:36px 0 12px}.lead{color:var(--dim);font-size:18px;max-width:640px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));padding:0;list-style:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}.card b{display:block;font-size:17px}
.card span{display:block;color:var(--dim);font-size:14px}.card a{text-decoration:none}.tag{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange1)}
.cta{margin:32px 0;padding:24px;border-radius:20px;background:linear-gradient(135deg,rgba(255,148,23,.16),rgba(255,82,35,.12));border:1px solid rgba(255,148,23,.3)}
.cta p{margin:0 0 14px;color:var(--dim)}.crumbs{font-size:14px;color:var(--dim)}.crumbs a{color:var(--dim)}
footer{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:center;padding:24px 16px;border-top:1px solid var(--line);font-size:13px;color:var(--dim)}footer a{color:var(--dim);text-decoration:none}
CSS;

try {
    $cities = cities();

    // Plan du site des villes, signalé dans robots.txt.
    if (isset($_GET['sitemap'])) {
        header('Content-Type: application/xml; charset=utf-8');
        echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        echo '<url><loc>' . SITE . '/foot/</loc><changefreq>daily</changefreq></url>';
        foreach (array_keys($cities) as $slug) {
            echo '<url><loc>' . SITE . '/foot/' . $slug . '/</loc><changefreq>daily</changefreq></url>';
        }
        echo '</urlset>';
        exit;
    }

    $slug = (string)($_GET['ville'] ?? '');
    if ($slug === '') {
        $items = '';
        foreach ($cities as $s => $c) {
            $n = count($c['venues']);
            $items .= '<li class="card"><a href="/foot/' . h($s) . '/"><b>Foot à ' . h($c['name']) . '</b><span>' . $n . ' terrain' . ($n > 1 ? 's' : '') . '</span></a></li>';
        }
        page(
            'Où jouer au foot city et au futsal près de chez toi · Supercity',
            'Les terrains de city, futsal, foot à 8 et à 11 ville par ville, et les matchs amateurs ouverts à rejoindre sur Supercity.',
            '/foot/',
            '<h1>Où jouer au <span>foot</span> près de chez toi</h1>'
            . '<p class="lead">City stades, salles de futsal, terrains à 8 et à 11 : les terrains ajoutés par les joueurs de Supercity, ville par ville, avec les matchs amateurs ouverts à tous.</p>'
            . ($items ? '<ul class="grid">' . $items . '</ul>' : '<p>Aucun terrain pour l\'instant.</p>')
            . '<div class="cta"><p>Ta ville n\'est pas là ? Ajoute ton terrain dans l\'appli et organise le premier match.</p><a class="btn" href="/app/">Ouvrir Supercity</a></div>'
        );
    }

    $city = $cities[$slug] ?? not_found_page();
    $name = $city['name'];
    $venues = $city['venues'];
    $matches = upcoming(array_map(fn($v) => (int)$v['id'], $venues));

    $matchList = '';
    $events = [];
    foreach ($matches as $m) {
        $label = $m['title'] ?: (FORMAT_LABELS[$m['format']] ?? 'Match');
        $left = max(0, (int)$m['max_players'] - (int)$m['players']);
        $price = (int)$m['price_cents'] > 0 ? number_format($m['price_cents'] / 100, 2, ',', ' ') . ' €' : 'Gratuit';
        $matchList .= '<li class="card"><a href="/app/match/' . (int)$m['id'] . '"><b>' . h($label) . '</b><span>' . h(when($m['starts_at'])) . '</span>'
            . '<span>' . h($m['venue_name']) . '</span><span class="tag">' . ($m['status'] === 'full' ? 'Complet' : $left . ' place' . ($left > 1 ? 's' : '') . ' · ' . $price) . '</span></a></li>';
        $start = new DateTime($m['starts_at'] . ' UTC');
        $events[] = [
            '@type' => 'SportsEvent',
            'name' => $label . ' à ' . $name,
            'sport' => 'Football',
            'startDate' => $start->format(DATE_ATOM),
            'endDate' => (clone $start)->modify('+' . (int)$m['duration_min'] . ' minutes')->format(DATE_ATOM),
            'eventStatus' => 'https://schema.org/EventScheduled',
            'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
            'url' => SITE . '/app/match/' . (int)$m['id'],
            'location' => ['@type' => 'SportsActivityLocation', 'name' => $m['venue_name'], 'address' => $m['venue_address']],
            'organizer' => ['@type' => 'Organization', 'name' => 'Supercity', 'url' => SITE],
            'offers' => ['@type' => 'Offer', 'price' => number_format($m['price_cents'] / 100, 2, '.', ''), 'priceCurrency' => 'EUR',
                'availability' => $m['status'] === 'full' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', 'url' => SITE . '/app/match/' . (int)$m['id']],
        ];
    }

    $venueList = '';
    $places = [];
    foreach ($venues as $v) {
        $kind = SURFACE_LABELS[$v['surface']] ?? 'Terrain';
        $venueList .= '<li class="card"><b>' . h($v['name']) . '</b><span>' . h($v['address']) . '</span><span class="tag">' . h($kind) . ($v['covered'] ? ' · couvert' : '') . '</span></li>';
        $places[] = [
            '@type' => 'SportsActivityLocation',
            'name' => $v['name'],
            'address' => $v['address'],
            'geo' => ['@type' => 'GeoCoordinates', 'latitude' => (float)$v['lat'], 'longitude' => (float)$v['lng']],
        ];
    }

    $nv = count($venues);
    $nm = count($matches);
    $desc = "Foot city, futsal, foot à 8 ou à 11 à $name : $nv terrain" . ($nv > 1 ? 's' : '')
        . ($nm ? " et $nm match" . ($nm > 1 ? 's' : '') . ' ouvert' . ($nm > 1 ? 's' : '') . ' à rejoindre' : '') . '. Trouve des joueurs et organise ton match avec Supercity.';
    page(
        "Foot city et futsal à $name : terrains et matchs · Supercity",
        $desc,
        "/foot/$slug/",
        '<p class="crumbs"><a href="/foot/">Villes</a> › ' . h($name) . '</p>'
        . '<h1>Jouer au foot à <span>' . h($name) . '</span></h1>'
        . '<p class="lead">Les terrains de city, de futsal et de foot à ' . h($name) . ' ajoutés par les joueurs, et les matchs amateurs ouverts à tous. Inscris-toi en un geste dans l\'appli.</p>'
        . '<h2>Matchs à venir à ' . h($name) . '</h2>'
        . ($matchList ? '<ul class="grid">' . $matchList . '</ul>' : '<p>Aucun match prévu pour le moment. Lance le premier !</p>')
        . '<div class="cta"><p>Il te manque des joueurs ? Publie ton match, les joueurs du coin sont prévenus.</p><a class="btn" href="/app/create">Organiser un match à ' . h($name) . '</a></div>'
        . '<h2>Terrains à ' . h($name) . '</h2><ul class="grid">' . $venueList . '</ul>',
        [
            '@context' => 'https://schema.org',
            '@graph' => [
                ['@type' => 'BreadcrumbList', 'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Villes', 'item' => SITE . '/foot/'],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => $name, 'item' => SITE . "/foot/$slug/"],
                ]],
                ...$events,
                ...$places,
            ],
        ]
    );
} catch (Throwable $e) {
    error_log('supercity foot: ' . $e);
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Page momentanément indisponible.';
}
