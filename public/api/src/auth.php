<?php
// Comptes joueurs et connexion par jeton (en-tête Authorization: Bearer <jeton>).
declare(strict_types=1);

const TOKEN_DAYS = 60;
const POSITIONS = ['gardien', 'defenseur', 'milieu', 'attaquant'];
const FEET = ['droit', 'gauche', 'les_deux'];

function current_user(): ?array
{
    static $user = false;
    if ($user === false) {
        $user = null;
        $token = bearer_token();
        if ($token !== null) {
            $row = one(
                'SELECT u.*, t.id AS token_id FROM auth_tokens t JOIN users u ON u.id = t.user_id
                 WHERE t.token_hash = ? AND t.expires_at > UTC_TIMESTAMP()',
                [hash('sha256', $token)]
            );
            if ($row) {
                query('UPDATE auth_tokens SET last_used_at = UTC_TIMESTAMP() WHERE id = ?', [$row['token_id']]);
                $user = $row;
            }
        }
    }
    return $user;
}

function require_user(): array
{
    return current_user() ?? throw new HttpError(401, 'unauthenticated', 'Connexion requise.');
}

function issue_token(int $userId): array
{
    $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    query(
        'INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL ' . TOKEN_DAYS . ' DAY)',
        [$userId, hash('sha256', $token)]
    );
    // Ménage : on garde au plus 10 sessions par joueur.
    query(
        'DELETE FROM auth_tokens WHERE user_id = ? AND id NOT IN (
           SELECT id FROM (SELECT id FROM auth_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 10) keep)',
        [$userId, $userId]
    );
    return ['token' => $token, 'expires_in_days' => TOKEN_DAYS];
}

/** Profil public d'un joueur (sans e-mail). */
function public_user(array $u): array
{
    return [
        'id' => (int)$u['id'],
        'display_name' => $u['display_name'],
        'city' => $u['city'],
        'position' => $u['position'],
        'level' => $u['level'] === null ? null : (int)$u['level'],
        'strong_foot' => $u['strong_foot'],
        'avatar_url' => $u['avatar_url'],
    ];
}

function private_user(array $u): array
{
    return public_user($u) + [
        'email' => $u['email'],
        'email_verified' => $u['email_verified_at'] !== null,
        'birth_date' => $u['birth_date'],
        'created_at' => iso($u['created_at']),
    ];
}

/** Coupe toutes les sessions d'un joueur, sauf éventuellement celle en cours. */
function revoke_tokens(int $userId, ?int $keepTokenId = null): void
{
    query('DELETE FROM auth_tokens WHERE user_id = ? AND id <> ?', [$userId, $keepTokenId ?? 0]);
}

function profile_validator(array $data, bool $partial): Validator
{
    return validate($data, $partial)
        ->string('display_name', 2, 40, true)
        ->string('city', 1, 80, false)
        ->enum('position', POSITIONS, false)
        ->int('level', 1, 5, false)
        ->enum('strong_foot', FEET, false)
        ->url('avatar_url');
}

function register_auth_routes(Router $r): void
{
    $r->post('/auth/register', function () {
        if (count_attempts('register', 'ip', client_ip(), 60, false) >= limit('register_per_ip')) {
            too_many("Trop d'inscriptions depuis ce réseau. Réessaie dans une heure.");
        }
        $data = body();
        $v = profile_validator($data, false)->email('email');
        $password = $data['password'] ?? '';
        $in = $v->out;
        if (!is_string($password)) {
            $v->errors['password'] = 'Mot de passe requis.';
        } elseif ($err = password_error($password, [$in['display_name'] ?? '', explode('@', (string)($in['email'] ?? ''))[0]])) {
            $v->errors['password'] = $err;
        }
        $birth = $data['birth_date'] ?? null;
        if (!is_string($birth) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birth) || !strtotime($birth) || date('Y-m-d', strtotime($birth)) !== $birth) {
            $v->errors['birth_date'] = 'Date de naissance requise (AAAA-MM-JJ).';
        } elseif (age_from($birth) > 100 || $birth > date('Y-m-d')) {
            $v->errors['birth_date'] = 'Date de naissance invalide.';
        } elseif (age_from($birth) < MIN_AGE) {
            $v->errors['birth_date'] = 'Il faut avoir au moins ' . MIN_AGE . ' ans pour créer un compte.';
        }
        if (($data['accept_terms'] ?? false) !== true) {
            $v->errors['accept_terms'] = "Il faut accepter les conditions d'utilisation.";
        }
        $in = $v->check();
        record_attempt('register', $in['email'], true);
        if (one('SELECT id FROM users WHERE email = ?', [$in['email']])) {
            throw new HttpError(409, 'email_taken', 'Un compte existe déjà avec cet e-mail.', ['email' => 'Déjà utilisé.']);
        }
        query(
            'INSERT INTO users (email, password_hash, display_name, birth_date, city, position, level, strong_foot, avatar_url, terms_accepted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            [
                $in['email'], password_hash($password, PASSWORD_DEFAULT), $in['display_name'], $birth,
                $in['city'] ?? null, $in['position'] ?? null, $in['level'] ?? null,
                $in['strong_foot'] ?? null, $in['avatar_url'] ?? null,
            ]
        );
        $id = (int)db()->lastInsertId();
        $user = one('SELECT * FROM users WHERE id = ?', [$id]);
        send_code($user, 'verify');
        respond(201, ['user' => private_user($user)] + issue_token($id));
    });

    $r->post('/auth/login', function () {
        $data = body();
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        if (count_attempts('login', 'ip', client_ip(), 15) >= limit('login_per_ip')
            || count_attempts('login', 'email', $email, 15) >= limit('login_per_email')) {
            too_many("Trop d'essais. Par sécurité, réessaie dans 15 minutes ou utilise « Mot de passe oublié ».");
        }
        $user = one('SELECT * FROM users WHERE email = ?', [$email]);
        // Même réponse que l'e-mail existe ou non, pour ne pas révéler les comptes.
        if (!$user || !password_verify($password, $user['password_hash'])) {
            record_attempt('login', $email, false);
            throw new HttpError(401, 'invalid_credentials', 'E-mail ou mot de passe incorrect.');
        }
        record_attempt('login', $email, true);
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        respond(200, ['user' => private_user($user)] + issue_token((int)$user['id']));
    });

    // Vérification de l'e-mail avec le code reçu.
    $r->post('/auth/verify-email', function () {
        $user = require_user();
        if ($user['email_verified_at'] !== null) {
            respond(200, private_user($user));
        }
        if (count_attempts('code', 'email', $user['email'], 15) >= 10) {
            too_many('Trop de codes faux. Réessaie dans 15 minutes.');
        }
        $code = preg_replace('/\D/', '', (string)(body()['code'] ?? ''));
        if (!consume_code((int)$user['id'], 'verify', $code)) {
            record_attempt('code', $user['email'], false);
            throw new HttpError(422, 'invalid_code', 'Code incorrect ou expiré.', ['code' => 'Code incorrect ou expiré.']);
        }
        query('UPDATE users SET email_verified_at = UTC_TIMESTAMP() WHERE id = ?', [$user['id']]);
        respond(200, private_user(one('SELECT * FROM users WHERE id = ?', [$user['id']])));
    });

    $r->post('/auth/resend-code', function () {
        $user = require_user();
        if ($user['email_verified_at'] === null) {
            send_code($user, 'verify');
        }
        respond(204);
    });

    // Mot de passe oublié : envoie un code (réponse identique que le compte existe ou non).
    $r->post('/auth/password/forgot', function () {
        $email = strtolower(trim((string)(body()['email'] ?? '')));
        $user = $email === '' ? null : one('SELECT * FROM users WHERE email = ?', [$email]);
        if ($user) {
            try {
                send_code($user, 'reset');
            } catch (HttpError $e) {
                // Limite d'envoi atteinte : on ne le révèle pas.
            }
        }
        respond(204);
    });

    $r->post('/auth/password/reset', function () {
        $data = body();
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        if (count_attempts('code', 'email', $email, 15) >= 10) {
            too_many('Trop de codes faux. Réessaie dans 15 minutes.');
        }
        $user = one('SELECT * FROM users WHERE email = ?', [$email]);
        $code = preg_replace('/\D/', '', (string)($data['code'] ?? ''));
        if (!$user || !consume_code((int)$user['id'], 'reset', $code)) {
            record_attempt('code', $email, false);
            throw new HttpError(422, 'invalid_code', 'Code incorrect ou expiré.', ['code' => 'Code incorrect ou expiré.']);
        }
        if ($err = password_error($password, [$user['display_name'], explode('@', $user['email'])[0]])) {
            throw new HttpError(422, 'validation_failed', 'Certains champs sont invalides.', ['password' => $err]);
        }
        // Le code prouve l'accès à la boîte mail : l'e-mail est donc vérifié aussi.
        query(
            'UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?',
            [password_hash($password, PASSWORD_DEFAULT), $user['id']]
        );
        revoke_tokens((int)$user['id']);
        $user = one('SELECT * FROM users WHERE id = ?', [$user['id']]);
        respond(200, ['user' => private_user($user)] + issue_token((int)$user['id']));
    });

    // Changer son mot de passe (déconnecte les autres appareils).
    $r->post('/me/password', function () {
        $user = require_user();
        $data = body();
        if (!password_verify((string)($data['current_password'] ?? ''), $user['password_hash'])) {
            throw new HttpError(422, 'validation_failed', 'Certains champs sont invalides.', ['current_password' => 'Mot de passe actuel incorrect.']);
        }
        $password = (string)($data['new_password'] ?? '');
        if ($err = password_error($password, [$user['display_name'], explode('@', $user['email'])[0]])) {
            throw new HttpError(422, 'validation_failed', 'Certains champs sont invalides.', ['new_password' => $err]);
        }
        query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        revoke_tokens((int)$user['id'], (int)$user['token_id']);
        respond(204);
    });

    $r->post('/auth/logout', function () {
        $user = require_user();
        query('DELETE FROM auth_tokens WHERE id = ?', [$user['token_id']]);
        respond(204);
    });

    $r->get('/me', function () {
        respond(200, private_user(require_user()));
    });

    $r->patch('/me', function () {
        $user = require_user();
        $in = profile_validator(body(), true)->check();
        if ($in) {
            $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($in)));
            query("UPDATE users SET $sets WHERE id = ?", [...array_values($in), $user['id']]);
        }
        respond(200, private_user(one('SELECT * FROM users WHERE id = ?', [$user['id']])));
    });

    $r->get('/users/(\d+)', function (string $id) {
        require_user();
        $u = one('SELECT * FROM users WHERE id = ?', [(int)$id]) ?? not_found('Joueur');
        respond(200, public_user($u));
    });
}
