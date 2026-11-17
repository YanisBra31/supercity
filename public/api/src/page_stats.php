<?php
// Statistiques des pages de match partagées (/m/<id>) : vues, comptes créés et inscriptions, par jour et par source.
// Rien de personnel n'est gardé : seulement des compteurs agrégés (pas d'IP, pas d'identifiant, pas de cookie).
declare(strict_types=1);

// Robots, aperçus de liens (WhatsApp, Instagram…) et outils : leurs passages ne sont pas des visites.
const STAT_BOTS = '/bot|crawl|spider|slurp|preview|facebookexternalhit|facebookcatalog|whatsapp|telegram|discord|snapchat|pinterest|embedly|'
    . 'headless|lighthouse|curl|wget|python|httpclient|go-http|java\/|okhttp|axios|node-fetch|scrapy|monitor/i';

/** « TikTok », « insta », absent… → tiktok, insta, direct. Une valeur bizarre devient « autre ». */
function stat_source(mixed $raw): string
{
    $s = strtolower(trim(is_string($raw) ? $raw : ''));
    if ($s === '') {
        return 'direct';
    }
    return preg_match('/^[a-z0-9_-]{1,24}$/', $s) ? $s : 'autre';
}

function is_bot(): bool
{
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    return $ua === '' || preg_match(STAT_BOTS, $ua) === 1;
}

/** +1 sur un compteur (views, accounts, joins) du jour, à l'heure de Paris. */
function bump_page_stat(int $matchId, mixed $src, string $column): void
{
    if (!in_array($column, ['views', 'accounts', 'joins'], true)) {
        return;
    }
    try {
        $day = (new DateTime('now', new DateTimeZone('Europe/Paris')))->format('Y-m-d');
        query(
            "INSERT INTO match_page_stats (day, match_id, src, $column) VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE $column = $column + 1",
            [$day, $matchId, stat_source($src)]
        );
    } catch (Throwable $e) {
        // Une statistique ne doit jamais faire échouer une inscription.
        error_log('supercity stats: ' . $e->getMessage());
    }
}

function page_stats(int $days): array
{
    $from = (new DateTime('now', new DateTimeZone('Europe/Paris')))->modify('-' . ($days - 1) . ' days')->format('Y-m-d');
    $sum = 'SUM(s.views) AS views, SUM(s.accounts) AS accounts, SUM(s.joins) AS joins';
    $bySource = query("SELECT s.src, $sum FROM match_page_stats s WHERE s.day >= ? GROUP BY s.src ORDER BY views DESC", [$from])->fetchAll();
    $byMatch = query(
        "SELECT s.match_id, m.title, m.format, m.starts_at, v.name AS venue, $sum
         FROM match_page_stats s JOIN matches m ON m.id = s.match_id JOIN venues v ON v.id = m.venue_id
         WHERE s.day >= ? GROUP BY s.match_id, m.title, m.format, m.starts_at, v.name ORDER BY views DESC LIMIT 100",
        [$from]
    )->fetchAll();
    $rows = query(
        "SELECT s.day, s.match_id, s.src, s.views, s.accounts, s.joins FROM match_page_stats s WHERE s.day >= ? ORDER BY s.day DESC, s.match_id, s.src",
        [$from]
    )->fetchAll();
    $total = ['views' => 0, 'accounts' => 0, 'joins' => 0];
    foreach ($bySource as $r) {
        foreach ($total as $k => $_) {
            $total[$k] += (int)$r[$k];
        }
    }
    return [
        'from' => $from,
        'days' => $days,
        'total' => $total,
        'by_source' => array_map(fn($r) => ['src' => $r['src']] + array_map('intval', array_intersect_key($r, $total)), $bySource),
        'by_match' => array_map(fn($r) => [
            'match_id' => (int)$r['match_id'],
            'label' => $r['title'] ?: (FORMAT_LABELS_STATS[$r['format']] ?? 'Match'),
            'starts_at' => iso($r['starts_at']),
            'venue' => $r['venue'],
            'url' => 'https://supercity.fr/m/' . (int)$r['match_id'],
        ] + array_map('intval', array_intersect_key($r, $total)), $byMatch),
        'rows' => array_map(fn($r) => ['day' => $r['day'], 'match_id' => (int)$r['match_id'], 'src' => $r['src']] + array_map('intval', array_intersect_key($r, $total)), $rows),
    ];
}

const FORMAT_LABELS_STATS = ['city5' => 'City à 5', 'futsal' => 'Futsal', 'foot8' => 'Foot à 8', 'foot11' => 'Foot à 11'];

function register_page_stat_routes(Router $r): void
{
    // Vue d'une page de match, envoyée par la page elle-même (les robots et les aperçus de liens n'exécutent pas ce script).
    $r->post('/public/matches/(\d+)/view', function (string $id) {
        $m = one('SELECT id, visibility FROM matches WHERE id = ?', [(int)$id]);
        if ($m && $m['visibility'] === 'public' && !is_bot()) {
            bump_page_stat((int)$m['id'], body()['src'] ?? null, 'views');
        }
        respond(204, null);
    });

    // Bilan pour les admins : ?days=7 (1 à 90). L'appli en tire aussi un fichier CSV.
    $r->get('/admin/page-stats', function () {
        require_role('admin');
        $days = max(1, min(90, (int)($_GET['days'] ?? 7)));
        respond(200, page_stats($days));
    });
}
