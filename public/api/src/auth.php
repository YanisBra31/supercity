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
    return public_user($u) + ['email' => $u['email'], 'created_at' => iso($u['created_at'])];
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
        $data = body();
        $v = profile_validator($data, false)->email('email');
        $password = $data['password'] ?? '';
        if (!is_string($password) || strlen($password) < 8 || strlen($password) > 200) {
            $v->errors['password'] = 'Au moins 8 caractères.';
        }
        $in = $v->check();
        if (one('SELECT id FROM users WHERE email = ?', [$in['email']])) {
            throw new HttpError(409, 'email_taken', 'Un compte existe déjà avec cet e-mail.', ['email' => 'Déjà utilisé.']);
        }
        query(
            'INSERT INTO users (email, password_hash, display_name, city, position, level, strong_foot, avatar_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $in['email'], password_hash($password, PASSWORD_DEFAULT), $in['display_name'],
                $in['city'] ?? null, $in['position'] ?? null, $in['level'] ?? null,
                $in['strong_foot'] ?? null, $in['avatar_url'] ?? null,
            ]
        );
        $id = (int)db()->lastInsertId();
        $user = one('SELECT * FROM users WHERE id = ?', [$id]);
        respond(201, ['user' => private_user($user)] + issue_token($id));
    });

    $r->post('/auth/login', function () {
        $data = body();
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        $user = one('SELECT * FROM users WHERE email = ?', [$email]);
        // Même réponse que l'e-mail existe ou non, pour ne pas révéler les comptes.
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new HttpError(401, 'invalid_credentials', 'E-mail ou mot de passe incorrect.');
        }
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        respond(200, ['user' => private_user($user)] + issue_token((int)$user['id']));
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
