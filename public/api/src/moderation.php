<?php
// Rôles (modérateur, admin), file des signalements et suspension de compte.
declare(strict_types=1);

const ROLES = ['user', 'moderator', 'admin'];
const ROLE_RANK = ['user' => 0, 'moderator' => 1, 'admin' => 2];

function role_of(array $u): string
{
    return $u['site_role'] ?? 'user';
}

function is_moderator(array $u): bool
{
    return ROLE_RANK[role_of($u)] >= ROLE_RANK['moderator'];
}

/** Joueur connecté avec au moins ce rôle. */
function require_role(string $role): array
{
    $user = require_user();
    if (ROLE_RANK[role_of($user)] < ROLE_RANK[$role]) {
        forbidden($role === 'admin' ? 'Réservé aux admins.' : 'Réservé aux modérateurs.');
    }
    return $user;
}

/** Date de fin de suspension (ISO) si le compte est suspendu maintenant, sinon null. */
function suspension_of(array $u): ?string
{
    $until = $u['suspended_until'] ?? null;
    return $until !== null && strtotime($until . ' UTC') > time() ? iso($until) : null;
}

/** Un compte suspendu peut lire, mais ni publier, ni commenter, ni organiser. */
function refuse_if_suspended(array $u): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' || suspension_of($u) === null) {
        return;
    }
    $path = (string)parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if (str_ends_with($path, '/auth/logout')) {
        return;
    }
    $until = (new DateTimeImmutable($u['suspended_until'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/Paris'))->format('d/m/Y à H\hi');
    throw new HttpError(403, 'suspended', "Ton compte est suspendu jusqu'au $until." . ($u['suspended_reason'] ? " Motif : {$u['suspended_reason']}" : ''));
}

function register_moderation_routes(Router $r): void
{
    // Publications signalées, les plus signalées d'abord (y compris celles déjà masquées).
    $r->get('/mod/reports', function () {
        $mod = require_role('moderator');
        $rows = query(
            'SELECT p.*, COUNT(r.user_id) AS reports, MAX(r.created_at) AS last_report
             FROM posts p JOIN post_reports r ON r.post_id = p.id
             GROUP BY p.id ORDER BY reports DESC, last_report DESC LIMIT 100'
        )->fetchAll();
        $views = post_views($rows, (int)$mod['id']);
        $items = [];
        foreach ($rows as $i => $p) {
            $reasons = array_column(query(
                'SELECT reason FROM post_reports WHERE post_id = ? AND reason IS NOT NULL ORDER BY created_at DESC LIMIT 5',
                [$p['id']]
            )->fetchAll(), 'reason');
            $items[] = ['post' => $views[$i], 'reports' => (int)$p['reports'], 'reasons' => $reasons, 'hidden' => (int)$p['reports'] >= REPORTS_TO_HIDE];
        }
        respond(200, ['items' => $items]);
    });

    // Garder la publication : on efface ses signalements, elle réapparaît pour tous.
    $r->post('/mod/posts/(\d+)/keep', function (string $id) {
        require_role('moderator');
        $p = load_post((int)$id);
        query('DELETE FROM post_reports WHERE post_id = ?', [$p['id']]);
        respond(204);
    });

    // Recherche de joueurs par pseudo ou e-mail (pour nommer ou suspendre).
    $r->get('/mod/users', function () {
        require_role('moderator');
        $q = trim((string)($_GET['q'] ?? ''));
        if (mb_strlen($q) < 2) {
            respond(200, ['items' => []]);
        }
        $like = '%' . addcslashes($q, '%_\\') . '%';
        $rows = query('SELECT * FROM users WHERE deleted_at IS NULL AND (display_name LIKE ? OR email LIKE ?) ORDER BY display_name LIMIT 30', [$like, $like])->fetchAll();
        respond(200, ['items' => array_map(fn($u) => public_user($u) + ['email' => $u['email']], $rows)]);
    });

    $r->post('/mod/users/(\d+)/suspend', function (string $id) {
        $mod = require_role('moderator');
        $target = one('SELECT * FROM users WHERE id = ?', [(int)$id]) ?? not_found('Joueur');
        if ((int)$target['id'] === (int)$mod['id']) {
            forbidden('Tu ne peux pas te suspendre toi-même.');
        }
        if (ROLE_RANK[role_of($target)] >= ROLE_RANK[role_of($mod)]) {
            forbidden('Tu ne peux pas suspendre un joueur de rang égal ou supérieur au tien.');
        }
        $in = validate(body())->int('days', 1, 365)->string('reason', 1, 200, false)->check();
        query(
            'UPDATE users SET suspended_until = UTC_TIMESTAMP() + INTERVAL ' . $in['days'] . ' DAY, suspended_reason = ? WHERE id = ?',
            [$in['reason'] ?? null, $target['id']]
        );
        respond(200, moderated_user((int)$target['id']));
    });

    $r->delete('/mod/users/(\d+)/suspend', function (string $id) {
        require_role('moderator');
        $target = one('SELECT * FROM users WHERE id = ?', [(int)$id]) ?? not_found('Joueur');
        query('UPDATE users SET suspended_until = NULL, suspended_reason = NULL WHERE id = ?', [$target['id']]);
        respond(200, moderated_user((int)$target['id']));
    });

    // Nommer ou retirer un modérateur ou un admin.
    $r->post('/admin/users/(\d+)/role', function (string $id) {
        $admin = require_role('admin');
        $target = one('SELECT * FROM users WHERE id = ?', [(int)$id]) ?? not_found('Joueur');
        $in = validate(body())->enum('role', ROLES)->check();
        if ((int)$target['id'] === (int)$admin['id'] && $in['role'] !== 'admin') {
            forbidden('Tu ne peux pas retirer ton propre rôle d\'admin.');
        }
        query('UPDATE users SET site_role = ? WHERE id = ?', [$in['role'], $target['id']]);
        respond(200, moderated_user((int)$target['id']));
    });

    // Donner (ou reprendre) des points de grade, à soi-même aussi : { amount }.
    $r->post('/admin/users/(\d+)/points', function (string $id) {
        $admin = require_role('admin');
        $target = one('SELECT * FROM users WHERE id = ?', [(int)$id]) ?? not_found('Joueur');
        $in = validate(body())->int('amount', -1000, 1000)->check();
        if ($in['amount'] === 0) {
            throw new HttpError(422, 'validation_failed', 'Montant nul.', ['amount' => 'Montant non nul attendu.']);
        }
        query('INSERT INTO grade_bonus (user_id, amount, created_by) VALUES (?, ?, ?)', [$target['id'], $in['amount'], $admin['id']]);
        respond(200, moderated_user((int)$target['id']));
    });
}

function moderated_user(int $id): array
{
    $u = one('SELECT * FROM users WHERE id = ?', [$id]);
    return public_user($u) + ['email' => $u['email']];
}
