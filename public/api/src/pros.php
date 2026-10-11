<?php
// Espace pro : un five, un club, une association ou un coach crée son organisation, relie son compte Stripe
// et publie des matchs et des tournois payants. Supercity prend une commission sur chaque place vendue.
declare(strict_types=1);

const ORG_KINDS = ['five', 'club', 'association', 'coach', 'autre'];
const LEGAL_FORMS = ['company', 'non_profit', 'individual'];

function my_organization(int $userId): ?array
{
    return one('SELECT * FROM organizations WHERE owner_id = ?', [$userId]);
}

/** Vue publique, affichée sur les matchs et la page de l'organisation. */
function org_public_view(array $o): array
{
    return [
        'id' => (int)$o['id'],
        'name' => $o['name'],
        'kind' => $o['kind'],
        'city' => $o['city'],
        'description' => $o['description'],
    ];
}

/** Vue du propriétaire : paiements et chiffres. */
function org_owner_view(array $o): array
{
    $sales = one(
        'SELECT COUNT(*) AS sold, COALESCE(SUM(p.amount_cents - p.fee_cents), 0) AS gross, COALESCE(SUM(p.commission_cents), 0) AS commission
         FROM payments p JOIN matches m ON m.id = p.match_id WHERE m.organization_id = ? AND p.status = "paid"',
        [$o['id']]
    );
    $upcoming = (int)one(
        'SELECT COUNT(*) AS n FROM matches WHERE organization_id = ? AND status <> "cancelled" AND starts_at >= UTC_TIMESTAMP()',
        [$o['id']]
    )['n'];
    return org_public_view($o) + [
        'legal_form' => $o['legal_form'],
        'payouts' => payout_view($o),
        'stats' => [
            'upcoming' => $upcoming,
            'places_sold' => (int)$sales['sold'],
            'gross_cents' => (int)$sales['gross'],
            'commission_cents' => (int)$sales['commission'],
            'net_cents' => (int)$sales['gross'] - (int)$sales['commission'],
        ],
    ];
}

function require_organization(array $user): array
{
    return my_organization((int)$user['id']) ?? throw new HttpError(404, 'no_organization', "Crée d'abord ton espace pro.");
}

function register_pro_routes(Router $r): void
{
    // Mon espace pro (null si pas encore créé).
    $r->get('/me/organization', function () {
        $user = require_user();
        $o = my_organization((int)$user['id']);
        if ($o && stripe_config() && $o['stripe_account_id']) {
            $o = sync_account($o);
        }
        respond(200, ['organization' => $o ? org_owner_view($o) : null]);
    });

    $r->post('/me/organization', function () {
        $user = require_user();
        if (my_organization((int)$user['id'])) {
            throw new HttpError(409, 'organization_exists', 'Tu as déjà un espace pro.');
        }
        $in = validate(body())
            ->string('name', 2, 80)
            ->enum('kind', ORG_KINDS)
            ->enum('legal_form', LEGAL_FORMS)
            ->string('city', 1, 80, false)
            ->string('description', 1, 500, false)
            ->check();
        query(
            'INSERT INTO organizations (owner_id, name, kind, legal_form, city, description) VALUES (?, ?, ?, ?, ?, ?)',
            [$user['id'], $in['name'], $in['kind'], $in['legal_form'], $in['city'] ?? null, $in['description'] ?? null]
        );
        respond(201, ['organization' => org_owner_view(my_organization((int)$user['id']))]);
    });

    $r->patch('/me/organization', function () {
        $user = require_user();
        $o = require_organization($user);
        $in = validate(body(), true)
            ->string('name', 2, 80)
            ->enum('kind', ORG_KINDS)
            ->enum('legal_form', LEGAL_FORMS)
            ->string('city', 1, 80, false)
            ->string('description', 1, 500, false)
            ->check();
        // La forme juridique est celle déclarée à Stripe : elle ne change plus une fois le compte créé.
        if (isset($in['legal_form']) && $in['legal_form'] !== $o['legal_form'] && $o['stripe_account_id']) {
            throw new HttpError(409, 'legal_form_locked', 'Ton compte Stripe est déjà créé avec cette forme juridique.', ['legal_form' => 'Déjà déclarée à Stripe.']);
        }
        foreach (['name', 'kind', 'legal_form'] as $required) {
            if (array_key_exists($required, $in) && $in[$required] === null) {
                unset($in[$required]);
            }
        }
        if ($in) {
            $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($in)));
            query("UPDATE organizations SET $sets WHERE id = ?", [...array_values($in), $o['id']]);
        }
        respond(200, ['organization' => org_owner_view(my_organization((int)$user['id']))]);
    });

    // Activer les paiements : crée le compte Stripe de l'organisation au besoin et renvoie le lien d'inscription Stripe.
    $r->post('/me/organization/onboard', function () {
        $user = require_user();
        $o = require_organization($user);
        $in = validate(body())->string('return_url', 1, 500, false)->check();
        $back = app_return($in['return_url'] ?? null);
        if (!$o['stripe_account_id']) {
            // Compte Accounts v2 : il reçoit le prix des places (paiements à destination), avec le tableau de bord
            // Express. Pour un compte français, Stripe exige la capacité carte (merchant) en plus des virements
            // (recipient). Supercity porte les frais Stripe et les litiges.
            // Plateforme française : l'e-mail et le nom passent par un jeton de compte, créé avec la clé publiable en
            // production. Le pays se donne à part, sur le compte. Le reste (forme juridique, SIRET, RIB) est demandé
            // par l'inscription Stripe.
            $token = stripe('POST', '/v2/core/account_tokens', [
                'contact_email' => $user['email'],
                'display_name' => $o['name'],
            ], null, publishable_key());
            $acct = stripe('POST', '/v2/core/accounts', [
                'account_token' => $token['id'],
                'identity' => ['country' => 'fr'],
                'dashboard' => 'express',
                'configuration' => [
                    'merchant' => ['capabilities' => ['card_payments' => ['requested' => true]]],
                    'recipient' => ['capabilities' => ['stripe_balance' => ['stripe_transfers' => ['requested' => true]]]],
                ],
                'defaults' => [
                    'currency' => 'eur',
                    'locales' => ['fr-FR'],
                    'responsibilities' => ['fees_collector' => 'application', 'losses_collector' => 'application'],
                ],
                'metadata' => ['organization_id' => (string)$o['id'], 'user_id' => (string)$user['id']],
            ], "org-account-{$o['id']}-{$token['id']}");
            query('UPDATE organizations SET stripe_account_id = ? WHERE id = ?', [$acct['id'], $o['id']]);
            $o['stripe_account_id'] = $acct['id'];
        }
        $link = stripe('POST', '/v2/core/account_links', [
            'account' => $o['stripe_account_id'],
            'use_case' => [
                'type' => 'account_onboarding',
                'account_onboarding' => [
                    'configurations' => ['merchant', 'recipient'],
                    'refresh_url' => bounce_url($back, ['onboard' => 'retry']),
                    'return_url' => bounce_url($back, ['onboard' => 'done']),
                ],
            ],
        ]);
        respond(200, ['url' => $link['url']]);
    });

    // Tableau de bord Stripe de l'organisation (virements reçus, RIB).
    $r->post('/me/organization/dashboard', function () {
        $user = require_user();
        $o = require_organization($user);
        if (!$o['stripe_account_id']) {
            throw new HttpError(409, 'not_connected', "Active d'abord les paiements.");
        }
        $link = stripe('POST', '/accounts/' . rawurlencode($o['stripe_account_id']) . '/login_links');
        respond(200, ['url' => $link['url']]);
    });

    // Page publique d'une organisation, avec ses matchs et tournois publics à venir.
    $r->get('/organizations/(\d+)', function (string $id) {
        $user = require_user();
        $o = one('SELECT * FROM organizations WHERE id = ?', [(int)$id]) ?? not_found('Organisation');
        $rows = query(
            'SELECT * FROM matches WHERE organization_id = ? AND visibility = "public" AND status <> "cancelled"
             AND starts_at >= UTC_TIMESTAMP() ORDER BY starts_at LIMIT 50',
            [$o['id']]
        )->fetchAll();
        respond(200, org_public_view($o) + ['matches' => array_map(fn($m) => match_view($m, (int)$user['id']), $rows)]);
    });
}
