<?php
// Pages publiques pour les moteurs de recherche : /foot/ (les villes), /foot/<ville>/ (terrains et matchs à venir),
// /foot/sitemap.xml, et la page d'un match à partager : /m/<id> (son aperçu en image : /m/<id>.jpg). Générées à chaque visite depuis la base de l'appli : rien à reconstruire quand un terrain s'ajoute.
// Aucune donnée personnelle : seulement les terrains et les matchs publics, sans le nom des joueurs.
declare(strict_types=1);

require __DIR__ . '/../api/src/lib.php';

date_default_timezone_set('UTC');
const SITE = 'https://supercity.fr';
const FORMAT_LABELS = ['city5' => 'City à 5', 'futsal' => 'Futsal', 'foot8' => 'Foot à 8', 'foot11' => 'Foot à 11'];
const SURFACE_LABELS = ['city' => 'City stade', 'synthetique' => 'Synthétique', 'herbe' => 'Herbe', 'parquet' => 'Parquet (salle)', 'autre' => 'Terrain'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const LEVELS = ['Débutant', 'Loisir', 'Régulier', 'Confirmé', 'Expert'];

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

function page(string $title, string $description, string $canonical, string $body, array $jsonLd = [], string $image = '/affiche.jpg', bool $index = true): never
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
        . '<meta property="og:url" content="' . h(SITE . $canonical) . '"><meta property="og:image" content="' . h(SITE . $image) . '">'
        . '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">'
        . ($index ? '' : '<meta name="robots" content="noindex">')
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

/** Un match à partager, sans le nom des joueurs : terrain, heure, places restantes. */
function public_match(int $id): ?array
{
    $m = one(
        "SELECT m.*, v.name AS venue_name, v.address AS venue_address, v.city AS venue_city_field, v.surface, v.covered,
                (SELECT COUNT(*) FROM match_participants p WHERE p.match_id = m.id
                  AND (p.status = 'registered' OR (p.status = 'pending' AND p.hold_until > UTC_TIMESTAMP()))) AS players
         FROM matches m JOIN venues v ON v.id = m.venue_id WHERE m.id = ?",
        [$id]
    );
    if (!$m) {
        return null;
    }
    $end = strtotime($m['starts_at'] . ' UTC') + 60 * (int)$m['duration_min'];
    $m['state'] = $m['status'] === 'cancelled' ? 'cancelled' : ($end <= time() ? 'finished' : ((int)$m['players'] >= (int)$m['max_players'] ? 'full' : 'open'));
    $m['left'] = max(0, (int)$m['max_players'] - (int)$m['players']);
    $m['label'] = $m['title'] ?: (($m['kind'] === 'tournament' ? 'Tournoi · ' : '') . (FORMAT_LABELS[$m['format']] ?? 'Match'));
    $m['city'] = venue_city(['city' => $m['venue_city_field'], 'address' => $m['venue_address']]);
    $m['price'] = (int)$m['price_cents'] > 0 ? number_format($m['price_cents'] / 100, 2, ',', ' ') . ' €' : 'Gratuit';
    return $m;
}

function when_long(string $utc): string
{
    $d = new DateTime($utc . ' UTC');
    $d->setTimezone(new DateTimeZone('Europe/Paris'));
    return ucfirst(DAYS_LONG[(int)$d->format('w')]) . ' ' . $d->format('j') . ' ' . MONTHS_LONG[(int)$d->format('n') - 1] . ' à ' . $d->format('G\hi');
}

/** « 3 places restantes », « Complet », « Match terminé »… */
function places_text(array $m): string
{
    return match ($m['state']) {
        'cancelled' => 'Match annulé',
        'finished' => 'Match terminé',
        'full' => 'Complet',
        default => $m['left'] === 1 ? 'Dernière place' : $m['left'] . ' places restantes',
    };
}

function match_page(int $id, bool $image): never
{
    $m = $id > 0 ? public_match($id) : null;
    $private = $m && $m['visibility'] !== 'public';
    if ($image) {
        match_image($m && !$private ? $m : null);
    }
    // Sans compte : inscription, puis retour sur le match. Déjà connecté : l'appli ouvre directement le match.
    $join = '/app/register?next=' . rawurlencode("/match/$id");
    if (!$m) {
        http_response_code(404);
        page('Match introuvable · Supercity', "Ce match n'existe plus sur Supercity.", '/foot/',
            '<h1>Match introuvable</h1><p class="lead">Ce match a peut-être été supprimé. Les autres matchs de ta ville sont sur Supercity.</p>'
            . '<p><a class="btn" href="/foot/">Voir les matchs près de chez toi</a></p>', [], '/affiche.jpg', false);
    }
    if ($private) {
        page('Match privé · Supercity', 'Un match sur invitation sur Supercity.', "/m/$id",
            '<h1>Match <span>privé</span></h1><p class="lead">Ce match est sur invitation. Connecte-toi pour le voir si tu fais partie des invités.</p>'
            . '<p><a class="btn" href="' . $join . '">Ouvrir dans l\'appli</a></p>', [], '/affiche.jpg', false);
    }

    $open = $m['state'] === 'open';
    $max = (int)$m['max_players'];
    $players = min($max, (int)$m['players']);
    $pct = $max > 0 ? round(100 * $players / $max) : 0;
    $level = $m['level'] === null ? 'Tous niveaux' : (LEVELS[(int)$m['level'] - 1] ?? 'Tous niveaux');
    $kind = SURFACE_LABELS[$m['surface']] ?? 'Terrain';
    $cityLink = $m['city'] ? '<a href="/foot/' . h(slugify($m['city'])) . '/">Les autres matchs à ' . h($m['city']) . '</a>' : '<a href="/foot/">Les autres matchs</a>';
    $where = $m['city'] ? ' à ' . $m['city'] : '';
    $title = $m['label'] . $where . ', ' . lcfirst(when_long($m['starts_at']));
    $desc = places_text($m) . ' · ' . $m['price'] . ' · ' . $m['venue_name'] . '. ' . ($open ? 'Viens seul ou avec des potes, inscris-toi sur Supercity.' : 'Trouve un autre match sur Supercity.');

    $body = '<p class="crumbs"><a href="/foot/">Villes</a>' . ($m['city'] ? ' › <a href="/foot/' . h(slugify($m['city'])) . '/">' . h($m['city']) . '</a>' : '') . ' › Match</p>'
        . '<h1>' . h($m['label']) . '</h1>'
        . '<p class="lead">' . h(when_long($m['starts_at'])) . ' · ' . (int)$m['duration_min'] . ' min</p>'
        . '<div class="match">'
        . '<div class="places"><b class="' . ($open ? 'on' : 'off') . '">' . h(places_text($m)) . '</b>'
        . '<div class="bar" role="img" aria-label="' . $players . ' inscrits sur ' . $max . '"><i style="width:' . $pct . '%"></i></div>'
        . '<span>' . $players . ' inscrit' . ($players > 1 ? 's' : '') . ' sur ' . $max . '</span></div>'
        . '<dl><div><dt>Terrain</dt><dd>' . h($m['venue_name']) . '<small>' . h($m['venue_address']) . '</small></dd></div>'
        . '<div><dt>Format</dt><dd>' . h(FORMAT_LABELS[$m['format']] ?? 'Match') . '<small>' . h($kind) . ($m['covered'] ? ' · couvert' : '') . '</small></dd></div>'
        . '<div><dt>Niveau</dt><dd>' . h($level) . '</dd></div>'
        . '<div><dt>Prix</dt><dd>' . h($m['price']) . ((int)$m['price_cents'] > 0 ? '<small>Débité seulement si le match est complet</small>' : '') . '</dd></div></dl>'
        . ($m['description'] ? '<p class="desc">' . nl2br(h($m['description'])) . '</p>' : '')
        . ($open ? '<a class="btn big" href="' . $join . '">Je rejoins le match</a><p class="note">Pas encore de compte ? Tu le crées en 30 secondes, puis tu reviens ici.</p>'
            : '<a class="btn big" href="/foot/">Trouver un autre match</a>')
        . '</div>'
        . '<h2>Ton premier match ?</h2><ul class="faq">'
        . '<li><b>Je peux venir seul ?</b><span>Oui, c\'est fait pour ça : tu rejoins des joueurs du coin, l\'organisateur fait les équipes.</span></li>'
        . '<li><b>Et si je n\'ai pas le niveau ?</b><span>Le niveau du match est indiqué plus haut. « Tous niveaux » veut dire que tout le monde est bienvenu.</span></li>'
        . '<li><b>Et si je ne peux plus venir ?</b><span>Tu te retires depuis l\'appli et ta place passe au suivant sur la liste d\'attente.</span></li></ul>'
        . '<p>' . $cityLink . '</p>';

    $start = new DateTime($m['starts_at'] . ' UTC');
    page($title . ' · Supercity', $desc, "/m/$id", $body, [
        '@context' => 'https://schema.org',
        '@type' => 'SportsEvent',
        'name' => $m['label'] . $where,
        'sport' => 'Football',
        'startDate' => $start->format(DATE_ATOM),
        'endDate' => (clone $start)->modify('+' . (int)$m['duration_min'] . ' minutes')->format(DATE_ATOM),
        'eventStatus' => $m['state'] === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
        'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
        'url' => SITE . "/m/$id",
        'image' => SITE . "/m/$id.jpg",
        'location' => ['@type' => 'SportsActivityLocation', 'name' => $m['venue_name'], 'address' => $m['venue_address']],
        'organizer' => ['@type' => 'Organization', 'name' => 'Supercity', 'url' => SITE],
        'offers' => ['@type' => 'Offer', 'price' => number_format($m['price_cents'] / 100, 2, '.', ''), 'priceCurrency' => 'EUR',
            'availability' => $open ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', 'url' => SITE . "/m/$id"],
    ], "/m/$id.jpg?v=" . $players . ($open ? '' : $m['state'][0]), $m['state'] !== 'finished' && $m['state'] !== 'cancelled');
}

/** Aperçu 1200×630 montré par WhatsApp, Instagram, Messenger… quand le lien du match est partagé. */
function match_image(?array $m): never
{
    if (!$m || !function_exists('imagecreatetruecolor') || !function_exists('imagettftext')) {
        header('Location: /affiche.jpg', true, 302);
        exit;
    }
    $W = 1200;
    $H = 630;
    $im = imagecreatetruecolor($W, $H);
    $font = __DIR__ . '/fonts/Inter-Black.otf';
    $semi = __DIR__ . '/fonts/Inter-SemiBold.otf';
    // Fond nuit, halo orange en haut à droite.
    imagefilledrectangle($im, 0, 0, $W, $H, imagecolorallocate($im, 13, 10, 8));
    for ($r = 620; $r > 0; $r -= 4) {
        $a = (int)(127 - 34 * (1 - $r / 620) ** 1.6);
        imagefilledellipse($im, 1060, -40, $r * 2, $r * 2, imagecolorallocatealpha($im, 255, 82, 35, $a));
    }
    for ($r = 420; $r > 0; $r -= 4) {
        $a = (int)(127 - 22 * (1 - $r / 420) ** 1.6);
        imagefilledellipse($im, 40, 680, $r * 2, $r * 2, imagecolorallocatealpha($im, 255, 148, 23, $a));
    }
    $chalk = imagecolorallocate($im, 255, 248, 241);
    $dim = imagecolorallocatealpha($im, 255, 248, 241, 45);
    $orange = imagecolorallocate($im, 255, 148, 23);

    if (is_file($logo = __DIR__ . '/../logo-blanc.png') && ($l = @imagecreatefrompng($logo))) {
        $lh = 52;
        $lw = (int)round(imagesx($l) * $lh / imagesy($l));
        imagecopyresampled($im, $l, 72, 64, 0, 0, $lw, $lh, imagesx($l), imagesy($l));
        imagettftext($im, 30, 0, 72 + $lw + 16, 64 + 40, $chalk, $font, 'Supercity');
    }

    // Titre sur une ou deux lignes, réduit s'il est long.
    $title = $m['label'];
    $size = 72;
    $lines = wrap_text($title, $font, $size, $W - 144);
    while (count($lines) > 2 && $size > 44) {
        $size -= 6;
        $lines = wrap_text($title, $font, $size, $W - 144);
    }
    $lines = array_slice($lines, 0, 2);
    $y = 230;
    foreach ($lines as $line) {
        imagettftext($im, $size, 0, 70, $y, $chalk, $font, $line);
        $y += (int)($size * 1.18);
    }
    $y += 8;
    imagettftext($im, 32, 0, 72, $y, $orange, $semi, when_long($m['starts_at']));
    $y += 54;
    imagettftext($im, 28, 0, 72, $y, $dim, $semi, fit_text($m['venue_name'] . ($m['city'] ? ' · ' . $m['city'] : ''), $semi, 28, $W - 144));

    // Pastilles des places : pleines = prises. Puis le badge des places restantes.
    $max = (int)$m['max_players'];
    $taken = min($max, (int)$m['players']);
    $by = 540;
    $badge = places_text($m) . ' · ' . $m['price'];
    $box = imagettfbbox(28, 0, $font, $badge);
    $bw = $box[2] - $box[0] + 56;
    // Les pastilles prennent la place laissée par le badge ; trop serrées, on n'en met pas.
    $step = $max > 0 ? min(40, intdiv($W - 144 - $bw - 24, $max)) : 0;
    $bx = 72;
    if ($step >= 18) {
        $d = (int)round($step * 0.75);
        $x = 72 + intdiv($d, 2);
        for ($i = 0; $i < $max; $i++) {
            if ($i < $taken) {
                imagefilledellipse($im, $x, $by, $d, $d, imagecolorallocate($im, 255, 106, 35));
            } else {
                imageellipse($im, $x, $by, $d, $d, $dim);
                imageellipse($im, $x, $by, $d - 2, $d - 2, $dim);
            }
            $x += $step;
        }
        $bx = $x - $step + intdiv($d, 2) + 24;
    }
    $fill = $m['state'] === 'open' ? imagecolorallocate($im, 255, 82, 35) : imagecolorallocate($im, 60, 52, 48);
    rounded_box($im, $bx, $by - 34, $bx + $bw, $by + 34, 34, $fill);
    imagettftext($im, 28, 0, $bx + 28, $by + 13, $chalk, $font, $badge);

    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=600');
    imagejpeg($im, null, 86);
    exit;
}

function wrap_text(string $text, string $font, int $size, int $width): array
{
    $lines = [];
    $cur = '';
    foreach (preg_split('/\s+/u', trim($text)) as $word) {
        $try = $cur === '' ? $word : "$cur $word";
        $b = imagettfbbox($size, 0, $font, $try);
        if ($cur !== '' && $b[2] - $b[0] > $width) {
            $lines[] = $cur;
            $cur = $word;
        } else {
            $cur = $try;
        }
    }
    if ($cur !== '') {
        $lines[] = $cur;
    }
    return $lines;
}

function fit_text(string $text, string $font, int $size, int $width): string
{
    while (mb_strlen($text) > 4) {
        $b = imagettfbbox($size, 0, $font, $text);
        if ($b[2] - $b[0] <= $width) {
            return $text;
        }
        $text = rtrim(mb_substr($text, 0, -2)) . '…';
    }
    return $text;
}

function rounded_box(GdImage $im, int $x1, int $y1, int $x2, int $y2, int $r, int $c): void
{
    imagefilledrectangle($im, $x1 + $r, $y1, $x2 - $r, $y2, $c);
    imagefilledrectangle($im, $x1, $y1 + $r, $x2, $y2 - $r, $c);
    foreach ([[$x1 + $r, $y1 + $r], [$x2 - $r, $y1 + $r], [$x1 + $r, $y2 - $r], [$x2 - $r, $y2 - $r]] as [$cx, $cy]) {
        imagefilledellipse($im, $cx, $cy, $r * 2, $r * 2, $c);
    }
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
.match{margin:24px 0;padding:22px;border-radius:22px;background:var(--card);border:1px solid var(--line)}
.places b{display:block;font-size:26px;font-weight:900}.places b.on{color:var(--orange1)}.places span{color:var(--dim);font-size:14px}
.bar{height:10px;border-radius:99px;background:rgba(255,248,241,.1);margin:10px 0 6px;overflow:hidden}.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--orange1),var(--orange))}
dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:14px;margin:22px 0}dl div{min-width:0}dt{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
dd{margin:2px 0 0;font-weight:700;overflow-wrap:anywhere}dd small{display:block;font-weight:400;color:var(--dim);font-size:14px}.desc{color:var(--dim);white-space:normal}
.btn.big{display:block;text-align:center;font-size:18px;padding:15px 22px}.note{margin:10px 0 0;text-align:center;color:var(--dim);font-size:14px}
.faq{list-style:none;padding:0;display:grid;gap:10px}.faq li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px}.faq b{display:block}.faq span{color:var(--dim);font-size:15px}
footer{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:center;padding:24px 16px;border-top:1px solid var(--line);font-size:13px;color:var(--dim)}footer a{color:var(--dim);text-decoration:none}
CSS;

try {
    if (isset($_GET['match'])) {
        match_page((int)$_GET['match'], isset($_GET['img']));
    }
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
        $matchList .= '<li class="card"><a href="/m/' . (int)$m['id'] . '"><b>' . h($label) . '</b><span>' . h(when($m['starts_at'])) . '</span>'
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
            'url' => SITE . '/m/' . (int)$m['id'],
            'location' => ['@type' => 'SportsActivityLocation', 'name' => $m['venue_name'], 'address' => $m['venue_address']],
            'organizer' => ['@type' => 'Organization', 'name' => 'Supercity', 'url' => SITE],
            'offers' => ['@type' => 'Offer', 'price' => number_format($m['price_cents'] / 100, 2, '.', ''), 'priceCurrency' => 'EUR',
                'availability' => $m['status'] === 'full' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', 'url' => SITE . '/m/' . (int)$m['id']],
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
