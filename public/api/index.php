<?php
// Point d'entrée de l'API Supercity : toutes les adresses /api/v1/... arrivent ici (voir .htaccess).
declare(strict_types=1);

require __DIR__ . '/src/lib.php';
require __DIR__ . '/src/router.php';
require __DIR__ . '/src/security.php';
require __DIR__ . '/src/uploads.php';
require __DIR__ . '/src/auth.php';
require __DIR__ . '/src/teams.php';
require __DIR__ . '/src/venues.php';
require __DIR__ . '/src/matches.php';
require __DIR__ . '/src/challenges.php';
require __DIR__ . '/src/feed.php';
require __DIR__ . '/src/moderation.php';
require __DIR__ . '/src/payments.php';
require __DIR__ . '/src/pros.php';
require __DIR__ . '/src/series.php';
require __DIR__ . '/src/notifications.php';
require __DIR__ . '/src/shop.php';
require __DIR__ . '/src/cards.php';
require __DIR__ . '/src/privacy.php';
require __DIR__ . '/src/social.php';
require __DIR__ . '/src/chat.php';

date_default_timezone_set('UTC');

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$pos = strpos($uri, '/v1/');
$path = $pos === false ? '' : rtrim(substr($uri, $pos + 3), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    // Autorise un site web d'une autre origine (configurable), l'appli mobile n'en a pas besoin.
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, config()['cors_origins'] ?? [], true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    }
    if ($method === 'OPTIONS') {
        respond(204);
    }

    $router = new Router();
    $router->get('/health', fn() => respond(200, ['ok' => true, 'time' => gmdate('c')]));
    register_auth_routes($router);
    register_team_routes($router);
    register_venue_routes($router);
    register_match_routes($router);
    register_challenge_routes($router);
    register_feed_routes($router);
    register_moderation_routes($router);
    register_payment_routes($router);
    register_pro_routes($router);
    register_series_routes($router);
    register_notification_routes($router);
    register_shop_routes($router);
    register_card_routes($router);
    register_privacy_routes($router);
    register_social_routes($router);
    register_chat_routes($router);
    $router->dispatch($method, $path);
} catch (HttpError $e) {
    $payload = ['error' => $e->errorCode, 'message' => $e->getMessage()];
    if ($e->fields) {
        $payload['fields'] = $e->fields;
    }
    respond($e->status, $payload);
} catch (Throwable $e) {
    error_log('supercity api: ' . $e);
    respond(500, ['error' => 'server_error', 'message' => 'Erreur interne, réessaie plus tard.']);
}
