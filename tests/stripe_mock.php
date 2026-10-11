<?php
// Faux Stripe pour les tests (serveur PHP intégré) : comptes, sessions de paiement, remboursements, retours de virement.
// Usage : STRIPE_MOCK_STATE=/tmp/stripe.json php -S 127.0.0.1:8097 tests/stripe_mock.php
// Routes de test : POST /test/accounts/{id}/ready, POST /test/sessions/{id}/pay, GET /test/state.
declare(strict_types=1);

$file = getenv('STRIPE_MOCK_STATE') ?: sys_get_temp_dir() . '/stripe-mock.json';
$state = is_file($file) ? json_decode(file_get_contents($file), true) : ['n' => 0, 'accounts' => [], 'sessions' => [], 'refunds' => [], 'requests' => []];
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$raw = file_get_contents('php://input') ?: '';
if (str_starts_with($path, '/v2/')) {
    $in = json_decode($raw, true) ?? [];
} else {
    parse_str($raw, $in);
}
if ($method === 'GET') {
    $in = $_GET;
}

function out(int $status, array $data): never
{
    global $state, $file;
    file_put_contents($file, json_encode($state));
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
$id = fn(string $prefix) => $prefix . '_' . (++$GLOBALS['state']['n']);

if (str_starts_with($path, '/v1/') || str_starts_with($path, '/v2/')) {
    if (!preg_match('/^Bearer sk_/', $_SERVER['HTTP_AUTHORIZATION'] ?? '')) {
        out(401, ['error' => ['message' => 'No API key']]);
    }
    $state['requests'][] = ['method' => $method, 'path' => $path, 'params' => $in, 'version' => $_SERVER['HTTP_STRIPE_VERSION'] ?? null];
}

switch (true) {
    case $method === 'POST' && $path === '/v1/accounts':
        out(400, ['error' => ['type' => 'invalid_request_error', 'message' => 'Stripe no longer recommends Accounts v1 for new Connect integrations.']]);
    case $method === 'POST' && $path === '/v2/core/account_tokens' && str_starts_with($in['contact_email'] ?? '', 'sansconnect'):
        out(400, ['error' => ['type' => 'invalid_request_error', 'code' => 'platform_registration_required', 'message' => 'The direct merchant has not signed up for Connect and cannot create connected accounts.']]);
    case $method === 'POST' && $path === '/v2/core/account_tokens' && isset($in['identity']['country']):
        out(400, ['error' => ['type' => 'invalid_request_error', 'message' => 'Some fields in the request were invalid: identity.country: unknown field']]);
    case $method === 'POST' && $path === '/v2/core/account_tokens':
        $t = 'accttok_' . (++$state['n']);
        $state['tokens'][$t] = $in;
        out(200, ['id' => $t, 'object' => 'v2.core.account_token', 'used' => false]);
    case $method === 'POST' && $path === '/v2/core/accounts' && empty($in['account_token']):
        out(400, ['error' => ['type' => 'invalid_request_error', 'code' => 'account_token_required', 'message' => 'Connect platforms based in FR can only update certain identity information on a v2 Account with a merchant configuration via account tokens.']]);
    case $method === 'POST' && $path === '/v2/core/accounts' && (array_intersect(array_keys($in), ['contact_email', 'display_name']) || array_diff(array_keys($in['identity'] ?? []), ['country'])):
        out(400, ['error' => ['type' => 'invalid_request_error', 'code' => 'param_alongside_account_token', 'message' => 'Parameter cannot be passed alongside account_token.']]);
    case $method === 'POST' && $path === '/v2/core/accounts' && empty($in['configuration']['merchant']['capabilities']['card_payments']['requested']):
        out(400, ['error' => ['type' => 'invalid_request_error', 'message' => 'The stripe_balance.stripe_transfers capability cannot be requested without the configuration.merchant.capabilities.card_payments capability.']]);
    case $method === 'POST' && $path === '/v2/core/accounts':
        $a = ['id' => $id('acct'), 'object' => 'account', 'charges_enabled' => false, 'payouts_enabled' => false, 'capabilities' => ['transfers' => 'inactive'], 'email' => $state['tokens'][$in['account_token']]['contact_email'] ?? null];
        $state['accounts'][$a['id']] = $a;
        out(200, ['id' => $a['id'], 'object' => 'v2.core.account', 'dashboard' => $in['dashboard'] ?? null]);
    case $method === 'POST' && $path === '/v2/core/account_links':
        out(200, ['object' => 'v2.core.account_link', 'account' => $in['account'], 'url' => "https://connect.stripe.test/onboard/{$in['account']}", 'use_case' => $in['use_case']]);
    case $method === 'GET' && preg_match('#^/v1/accounts/([\w]+)$#', $path, $m) === 1:
        out(isset($state['accounts'][$m[1]]) ? 200 : 404, $state['accounts'][$m[1]] ?? ['error' => ['message' => 'No such account']]);
    case $method === 'POST' && $path === '/v1/account_links':
        out(200, ['object' => 'account_link', 'url' => "https://connect.stripe.test/onboard/{$in['account']}"]);
    case $method === 'POST' && preg_match('#^/v1/accounts/(\w+)/login_links$#', $path, $m) === 1:
        out(200, ['object' => 'login_link', 'url' => "https://connect.stripe.test/express/{$m[1]}"]);
    case $method === 'POST' && $path === '/v1/checkout/sessions':
        $sid = $id('cs_test');
        $s = ['id' => $sid, 'object' => 'checkout.session', 'url' => "https://checkout.stripe.test/pay/$sid", 'status' => 'open',
            'payment_status' => 'unpaid', 'payment_intent' => null, 'metadata' => $in['metadata'] ?? [], 'params' => $in];
        $state['sessions'][$sid] = $s;
        out(200, $s);
    case $method === 'GET' && preg_match('#^/v1/checkout/sessions/(\w+)$#', $path, $m) === 1:
        out(isset($state['sessions'][$m[1]]) ? 200 : 404, $state['sessions'][$m[1]] ?? ['error' => ['message' => 'No such session']]);
    case $method === 'POST' && preg_match('#^/v1/checkout/sessions/(\w+)/expire$#', $path, $m) === 1:
        if (($state['sessions'][$m[1]]['status'] ?? '') !== 'open') {
            out(400, ['error' => ['message' => 'Session is not open']]);
        }
        $state['sessions'][$m[1]]['status'] = 'expired';
        out(200, $state['sessions'][$m[1]]);
    case $method === 'GET' && preg_match('#^/v1/payment_intents/(\w+)$#', $path, $m) === 1:
        out(200, ['id' => $m[1], 'object' => 'payment_intent', 'latest_charge' => ['id' => "ch_{$m[1]}", 'transfer' => "tr_{$m[1]}"]]);
    case $method === 'POST' && preg_match('#^/v1/transfers/(\w+)/reversals$#', $path, $m) === 1:
        $r = ['id' => $id('trr'), 'object' => 'transfer_reversal', 'transfer' => $m[1]] + $in;
        $state['reversals'][] = $r;
        out(200, $r);
    case $method === 'POST' && $path === '/v1/refunds':
        $r = ['id' => $id('re'), 'object' => 'refund', 'status' => 'succeeded'] + $in;
        $state['refunds'][] = $r;
        out(200, $r);
    case $method === 'POST' && preg_match('#^/test/accounts/(\w+)/ready$#', $path, $m) === 1:
        $state['accounts'][$m[1]]['capabilities']['transfers'] = 'active';
        out(200, $state['accounts'][$m[1]]);
    case $method === 'POST' && preg_match('#^/test/sessions/(\w+)/pay$#', $path, $m) === 1:
        $state['sessions'][$m[1]]['status'] = 'complete';
        $state['sessions'][$m[1]]['payment_status'] = 'paid';
        $state['sessions'][$m[1]]['payment_intent'] = $id('pi');
        out(200, $state['sessions'][$m[1]]);
    case $method === 'GET' && $path === '/test/state':
        out(200, $state);
}
out(404, ['error' => ['message' => "Unknown $method $path"]]);
