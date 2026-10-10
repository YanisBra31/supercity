<?php
// Paiement de la place (Stripe Connect) : l'organisateur relie son compte Stripe, le joueur paie le prix
// de la place plus les frais de service Supercity, l'argent part à l'organisateur et les frais restent à Supercity.
declare(strict_types=1);

const HOLD_MINUTES = 30;          // place réservée pendant le paiement (minimum imposé par Stripe Checkout)
const PROMOTED_HOLD_HOURS = 6;    // place réservée pour qui sort de la liste d'attente
const REFUND_HOURS_BEFORE = 24;   // désistement remboursé jusqu'à 24 h avant le coup d'envoi
const PRICE_MAX_CENTS = 5000;

function stripe_config(): ?array
{
    $s = config()['stripe'] ?? null;
    return !empty($s['secret_key']) ? $s : null;
}

function service_fee(): int
{
    return (int)(stripe_config()['fee_cents'] ?? 50);
}

/** Appel à l'API Stripe (formulaire encodé, sans bibliothèque). */
function stripe(string $method, string $path, array $params = [], ?string $idempotencyKey = null): array
{
    $s = stripe_config() ?? throw new HttpError(503, 'payments_disabled', "Le paiement en ligne n'est pas encore activé.");
    $flat = function (array $a) use (&$flat): array {
        foreach ($a as $k => $v) {
            $a[$k] = is_bool($v) ? ($v ? 'true' : 'false') : (is_array($v) ? $flat($v) : $v);
        }
        return $a;
    };
    $url = rtrim($s['api_base'] ?? 'https://api.stripe.com', '/') . '/v1' . $path;
    $query = http_build_query($flat($params));
    $headers = ['Authorization: Bearer ' . $s['secret_key'], 'Stripe-Version: 2024-06-20'];
    if ($idempotencyKey) {
        $headers[] = "Idempotency-Key: $idempotencyKey";
    }
    $ch = curl_init($method === 'GET' && $query !== '' ? "$url?$query" : $url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_POSTFIELDS => $method === 'GET' ? null : $query,
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $data = json_decode((string)$raw, true);
    if ($raw === false || $status >= 400 || !is_array($data)) {
        error_log("supercity stripe $method $path: $status " . ($raw === false ? curl_error($ch) : $raw));
        throw new HttpError(502, 'payment_error', stripe_problem($status, $raw === false ? null : ($data['error']['message'] ?? null)));
    }
    return $data;
}

/** Explique un refus de Stripe : les erreurs de réglage du compte Supercity sont dites clairement. */
function stripe_problem(int $status, ?string $message): string
{
    $m = strtolower((string)$message);
    return match (true) {
        $message === null => 'Le service de paiement ne répond pas, réessaie dans un instant.',
        $status === 401 => 'Clé Stripe refusée : vérifie secret_key dans supercity-config.php.',
        str_contains($m, 'signed up for connect') => "Stripe Connect n'est pas encore activé sur le compte Stripe de Supercity.",
        str_contains($m, 'platform profile') || str_contains($m, 'responsibilities') => 'Termine le profil de plateforme dans Stripe (Connect > Paramètres).',
        str_contains($m, 'test mode') || str_contains($m, 'livemode') => "Clés Stripe de test et de production mélangées : utilise le même mode partout.",
        default => "Paiement refusé par Stripe : $message",
    };
}

/** Adresse publique d'une page de l'API (pages de retour Stripe). */
function api_url(string $path): string
{
    $https = ($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $prefix = substr($uri, 0, (int)strpos($uri, '/v1/') + 3);
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'supercity.fr') . $prefix . $path;
}

/** Adresse de retour vers l'appli : schéma de l'appli (ou Expo Go), ou site web autorisé. */
function app_return(?string $url): string
{
    $url = (string)$url;
    if (preg_match('#^(supercity|exp|exps)://#', $url)) {
        return $url;
    }
    $origin = preg_match('#^(https?://[^/]+)#', $url, $m) ? $m[1] : '';
    if ($origin !== '' && in_array($origin, config()['cors_origins'] ?? [], true)) {
        return $url;
    }
    return 'supercity://';
}

/** Page intermédiaire : Stripe n'accepte que des adresses web, on renvoie ensuite vers l'appli. */
function bounce_url(string $returnUrl, array $extra = []): string
{
    return api_url('/pay/back?' . http_build_query(['to' => $returnUrl] + $extra));
}

function payout_view(array $user): array
{
    return [
        'enabled' => stripe_config() !== null,
        'connected' => $user['stripe_account_id'] !== null,
        'ready' => (bool)$user['stripe_ready'],
        'fee_cents' => service_fee(),
        'refund_hours' => REFUND_HOURS_BEFORE,
    ];
}

/** Met à jour « prêt à encaisser » depuis Stripe. */
function sync_account(array $user): array
{
    if ($user['stripe_account_id'] === null) {
        return $user;
    }
    $acct = stripe('GET', '/accounts/' . rawurlencode($user['stripe_account_id']));
    $ready = !empty($acct['charges_enabled']) && !empty($acct['payouts_enabled']) ? 1 : 0;
    if ($ready !== (int)$user['stripe_ready']) {
        query('UPDATE users SET stripe_ready = ? WHERE id = ?', [$ready, $user['id']]);
        $user['stripe_ready'] = $ready;
    }
    return $user;
}

// ───── Places réservées ─────

/** Libère les places réservées dont le délai de paiement est passé. */
function expire_holds(int $matchId): void
{
    query(
        'UPDATE match_participants SET status = "withdrawn", hold_until = NULL
         WHERE match_id = ? AND status = "pending" AND hold_until <= UTC_TIMESTAMP()',
        [$matchId]
    );
}

/** Jusqu'à quand garder la place d'un joueur qui sort de la liste d'attente. */
function promoted_hold(array $m): string
{
    $start = strtotime($m['starts_at'] . ' UTC');
    return gmdate('Y-m-d H:i:s', max(time() + HOLD_MINUTES * 60, min(time() + PROMOTED_HOLD_HOURS * 3600, $start)));
}

// ───── Paiement d'une place ─────

/** Ouvre une page de paiement Stripe pour la place réservée de ce joueur. */
function create_checkout(array $m, array $user, string $returnUrl): string
{
    $organizer = one('SELECT * FROM users WHERE id = ?', [$m['organizer_id']]);
    if (!$organizer['stripe_ready'] || !$organizer['stripe_account_id']) {
        throw new HttpError(409, 'organizer_not_ready', "L'organisateur ne peut pas encore encaisser. Réessaie plus tard.");
    }
    $venue = one('SELECT name FROM venues WHERE id = ?', [$m['venue_id']]);
    $price = (int)$m['price_cents'];
    $fee = service_fee();
    $when = (new DateTimeImmutable($m['starts_at'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/Paris'))->format('d/m à H\hi');
    $session = stripe('POST', '/checkout/sessions', [
        'mode' => 'payment',
        'locale' => 'fr',
        'customer_email' => $user['email'],
        'client_reference_id' => "{$m['id']}-{$user['id']}",
        'expires_at' => time() + HOLD_MINUTES * 60 + 60,
        'line_items' => [
            ['quantity' => 1, 'price_data' => ['currency' => 'eur', 'unit_amount' => $price, 'product_data' => ['name' => "Place · {$venue['name']} · $when"]]],
            ['quantity' => 1, 'price_data' => ['currency' => 'eur', 'unit_amount' => $fee, 'product_data' => ['name' => 'Frais de service Supercity']]],
        ],
        'payment_intent_data' => [
            'application_fee_amount' => $fee,
            'transfer_data' => ['destination' => $organizer['stripe_account_id']],
            'description' => "Supercity match {$m['id']}",
            'metadata' => ['match_id' => $m['id'], 'user_id' => $user['id']],
        ],
        'metadata' => ['match_id' => $m['id'], 'user_id' => $user['id']],
        'success_url' => bounce_url($returnUrl, ['paid' => 1]),
        'cancel_url' => bounce_url($returnUrl, ['paid' => 0]),
    ]);
    query(
        'INSERT INTO payments (match_id, user_id, session_id, amount_cents, fee_cents) VALUES (?, ?, ?, ?, ?)',
        [$m['id'], $user['id'], $session['id'], $price + $fee, $fee]
    );
    return $session['url'];
}

/**
 * Valide une session Stripe payée (appelé par le webhook et au retour dans l'appli, sans risque d'être fait deux fois).
 * Place encore réservée ou place libre : inscrit. Sinon (délai dépassé et match complet) : remboursé en entier.
 */
function finalize_session(array $session): void
{
    if (($session['payment_status'] ?? '') !== 'paid') {
        if (($session['status'] ?? '') === 'expired') {
            query('UPDATE payments SET status = "expired" WHERE session_id = ? AND status = "open"', [$session['id']]);
        }
        return;
    }
    $refund = transaction(function () use ($session) {
        $p = one('SELECT * FROM payments WHERE session_id = ? FOR UPDATE', [$session['id']]);
        if (!$p || $p['status'] === 'paid' || $p['status'] === 'refunded') {
            return null;
        }
        $pi = is_array($session['payment_intent'] ?? null) ? $session['payment_intent']['id'] : ($session['payment_intent'] ?? null);
        query('UPDATE payments SET status = "paid", payment_intent = ?, paid_at = UTC_TIMESTAMP() WHERE id = ?', [$pi, $p['id']]);
        $m = load_match((int)$p['match_id'], true);
        $me = one('SELECT status FROM match_participants WHERE match_id = ? AND user_id = ?', [$m['id'], $p['user_id']]);
        $held = $me && $me['status'] === 'pending';
        $already = $me && $me['status'] === 'registered';
        $free = registered_count((int)$m['id']) < (int)$m['max_players'];
        if ($m['status'] !== 'cancelled' && match_status($m) !== 'played' && !$already && ($held || $free)) {
            query(
                'INSERT INTO match_participants (match_id, user_id, status) VALUES (?, ?, "registered")
                 ON DUPLICATE KEY UPDATE status = "registered", hold_until = NULL, updated_at = CURRENT_TIMESTAMP',
                [$m['id'], $p['user_id']]
            );
            refresh_match((int)$m['id']);
            return null;
        }
        return ['payment_intent' => $pi] + $p;
    });
    if ($refund) {
        refund_payment($refund, true);
    }
}

/** Rembourse un paiement : le prix seul (désistement), ou tout, frais compris (match annulé, place perdue). */
function refund_payment(array $p, bool $withFee): void
{
    $amount = $withFee ? (int)$p['amount_cents'] : (int)$p['amount_cents'] - (int)$p['fee_cents'];
    if ($amount <= 0 || !$p['payment_intent']) {
        return;
    }
    stripe('POST', '/refunds', [
        'payment_intent' => $p['payment_intent'],
        'amount' => $amount,
        'reverse_transfer' => true,
        'refund_application_fee' => $withFee,
    ], "refund-{$p['id']}");
    query(
        'UPDATE payments SET status = "refunded", refund_cents = ?, refunded_at = UTC_TIMESTAMP() WHERE id = ?',
        [$amount, $p['id']]
    );
}

/** Paiement validé de ce joueur pour ce match, s'il y en a un. */
function paid_payment(int $matchId, int $userId): ?array
{
    return one('SELECT * FROM payments WHERE match_id = ? AND user_id = ? AND status = "paid" ORDER BY id DESC LIMIT 1', [$matchId, $userId]);
}

/** Désistement d'un match payant : remboursé (hors frais) jusqu'à 24 h avant, et la session en cours est fermée. */
function settle_withdrawal(array $m, int $userId): ?int
{
    foreach (query('SELECT session_id FROM payments WHERE match_id = ? AND user_id = ? AND status = "open"', [$m['id'], $userId])->fetchAll() as $s) {
        try {
            stripe('POST', '/checkout/sessions/' . rawurlencode($s['session_id']) . '/expire');
        } catch (HttpError) {
            // déjà fermée chez Stripe
        }
        query('UPDATE payments SET status = "expired" WHERE session_id = ? AND status = "open"', [$s['session_id']]);
    }
    $p = paid_payment((int)$m['id'], $userId);
    if (!$p || strtotime($m['starts_at'] . ' UTC') - time() < REFUND_HOURS_BEFORE * 3600) {
        return null;
    }
    try {
        refund_payment($p, false);
    } catch (HttpError) {
        // Le désistement est fait ; le remboursement se refera depuis le tableau de bord Stripe.
        error_log("supercity: remboursement {$p['id']} à refaire depuis le tableau de bord Stripe");
        return null;
    }
    return (int)$p['amount_cents'] - (int)$p['fee_cents'];
}

/** Match annulé : tout le monde est remboursé, frais compris. Un échec chez Stripe n'empêche pas les autres. */
function refund_all(int $matchId): void
{
    foreach (query('SELECT * FROM payments WHERE match_id = ? AND status = "paid"', [$matchId])->fetchAll() as $p) {
        try {
            refund_payment($p, true);
        } catch (HttpError) {
            error_log("supercity: remboursement {$p['id']} à refaire depuis le tableau de bord Stripe");
        }
    }
}

// ───── Webhook ─────

function verify_stripe_signature(string $payload, string $header, string $secret): bool
{
    $parts = [];
    foreach (explode(',', $header) as $kv) {
        [$k, $v] = array_pad(explode('=', trim($kv), 2), 2, '');
        $parts[$k][] = $v;
    }
    $t = (int)($parts['t'][0] ?? 0);
    if ($t === 0 || abs(time() - $t) > 300) {
        return false;
    }
    $expected = hash_hmac('sha256', "$t.$payload", $secret);
    foreach ($parts['v1'] ?? [] as $sig) {
        if (hash_equals($expected, $sig)) {
            return true;
        }
    }
    return false;
}

function register_payment_routes(Router $r): void
{
    // État des paiements de l'organisateur.
    $r->get('/me/payouts', function () {
        $user = require_user();
        if (stripe_config() && $user['stripe_account_id']) {
            $user = sync_account($user);
        }
        respond(200, payout_view($user));
    });

    // Activer les paiements : crée le compte Stripe au besoin et renvoie le lien d'inscription Stripe.
    $r->post('/me/payouts/onboard', function () {
        $user = require_user();
        $in = validate(body())->string('return_url', 1, 500, false)->check();
        $back = app_return($in['return_url'] ?? null);
        if (!$user['stripe_account_id']) {
            $acct = stripe('POST', '/accounts', [
                'type' => 'express',
                'country' => 'FR',
                'email' => $user['email'],
                'business_type' => 'individual',
                'capabilities' => ['card_payments' => ['requested' => true], 'transfers' => ['requested' => true]],
                'business_profile' => ['product_description' => 'Organisation de matchs de foot amateur sur Supercity', 'mcc' => '7941'],
                'metadata' => ['user_id' => $user['id']],
            ], "account-{$user['id']}");
            query('UPDATE users SET stripe_account_id = ? WHERE id = ?', [$acct['id'], $user['id']]);
            $user['stripe_account_id'] = $acct['id'];
        }
        $link = stripe('POST', '/account_links', [
            'account' => $user['stripe_account_id'],
            'type' => 'account_onboarding',
            'refresh_url' => bounce_url($back, ['onboard' => 'retry']),
            'return_url' => bounce_url($back, ['onboard' => 'done']),
        ]);
        respond(200, ['url' => $link['url']]);
    });

    // Tableau de bord Stripe de l'organisateur (virements reçus, RIB).
    $r->post('/me/payouts/dashboard', function () {
        $user = require_user();
        if (!$user['stripe_account_id']) {
            throw new HttpError(409, 'not_connected', "Active d'abord les paiements.");
        }
        $link = stripe('POST', '/accounts/' . rawurlencode($user['stripe_account_id']) . '/login_links');
        respond(200, ['url' => $link['url']]);
    });

    // Payer sa place réservée (inscription d'un match payant, ou sortie de liste d'attente).
    $r->post('/matches/(\d+)/pay', function (string $id) {
        $user = require_user();
        $in = validate(body())->string('return_url', 1, 500, false)->check();
        $m = load_match((int)$id);
        expire_holds((int)$m['id']);
        $me = one('SELECT status FROM match_participants WHERE match_id = ? AND user_id = ?', [$m['id'], $user['id']]);
        if (($me['status'] ?? null) !== 'pending') {
            throw new HttpError(409, 'nothing_to_pay', "Tu n'as pas de place à payer pour ce match.");
        }
        respond(200, ['checkout_url' => create_checkout($m, $user, app_return($in['return_url'] ?? null))]);
    });

    // Au retour dans l'appli : vérifie le paiement chez Stripe sans attendre le webhook.
    $r->post('/matches/(\d+)/pay/confirm', function (string $id) {
        $user = require_user();
        $m = load_match((int)$id);
        foreach (query('SELECT session_id FROM payments WHERE match_id = ? AND user_id = ? AND status = "open"', [$m['id'], $user['id']])->fetchAll() as $s) {
            finalize_session(stripe('GET', '/checkout/sessions/' . rawurlencode($s['session_id'])));
        }
        respond(200, match_view(load_match((int)$id), (int)$user['id'], true));
    });

    // Page de retour depuis Stripe, qui renvoie dans l'appli.
    $r->get('/pay/back', function () {
        $to = app_return($_GET['to'] ?? null);
        $extra = array_intersect_key($_GET, ['paid' => 1, 'onboard' => 1]);
        $target = $extra ? $to . (str_contains($to, '?') ? '&' : '?') . http_build_query($extra) : $to;
        header('Location: ' . $target, true, 302);
        header('Content-Type: text/html; charset=utf-8');
        $safe = htmlspecialchars($target, ENT_QUOTES);
        echo "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Supercity</title>"
            . "<p style='font-family:sans-serif;text-align:center;margin-top:40vh'>C'est fait. <a href=\"$safe\">Revenir dans Supercity</a></p>";
        exit;
    });

    // Événements envoyés par Stripe (paiement validé, session expirée, compte organisateur mis à jour).
    $r->post('/stripe/webhook', function () {
        $s = stripe_config() ?? not_found();
        $payload = file_get_contents('php://input') ?: '';
        // Un ou plusieurs secrets (un par point d'arrivée déclaré chez Stripe).
        $ok = false;
        foreach ((array)($s['webhook_secret'] ?? []) as $secret) {
            $ok = $ok || verify_stripe_signature($payload, $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '', (string)$secret);
        }
        if (!$ok) {
            respond(400, ['error' => 'bad_signature']);
        }
        $event = json_decode($payload, true);
        $obj = $event['data']['object'] ?? [];
        switch ($event['type'] ?? '') {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
            case 'checkout.session.expired':
                finalize_session($obj);
                break;
            case 'account.updated':
                $ready = !empty($obj['charges_enabled']) && !empty($obj['payouts_enabled']) ? 1 : 0;
                query('UPDATE users SET stripe_ready = ? WHERE stripe_account_id = ?', [$ready, $obj['id'] ?? '']);
                break;
        }
        respond(200, ['received' => true]);
    });
}
