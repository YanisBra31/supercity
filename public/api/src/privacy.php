<?php
// Droits RGPD dans l'appli : recevoir une copie de ses données par e-mail, supprimer son compte.
declare(strict_types=1);

// Copies de données envoyées au plus 3 fois par jour.
const EXPORT_PER_DAY = 3;

/** Tout ce que Supercity garde sur un joueur, lisible par lui. */
function user_export(int $id): array
{
    $u = one('SELECT * FROM users WHERE id = ?', [$id]);
    $rows = fn(string $sql) => query($sql, [$id])->fetchAll();
    return [
        'exported_at' => gmdate('c'),
        'account' => [
            'email' => $u['email'],
            'display_name' => $u['display_name'],
            'birth_date' => $u['birth_date'],
            'city' => $u['city'],
            'bio' => $u['bio'],
            'position' => $u['position'],
            'level' => $u['level'],
            'strong_foot' => $u['strong_foot'],
            'shirt_number' => $u['shirt_number'],
            'favorite_club' => $u['favorite_club'],
            'avatar_url' => $u['avatar_url'],
            'card_stats' => $u['card_stats'] ? json_decode($u['card_stats'], true) : null,
            'weak_foot' => $u['weak_foot'],
            'skill_moves' => $u['skill_moves'],
            'notify_events' => (bool)$u['notify_events'],
            'notify_streaks' => (bool)$u['notify_streaks'],
            'show_presence' => (bool)$u['show_presence'],
            'last_seen_at' => $u['last_seen_at'],
            'created_at' => $u['created_at'],
            'terms_accepted_at' => $u['terms_accepted_at'],
            'email_verified_at' => $u['email_verified_at'],
        ],
        'grade' => grade_for(user_stats($id)),
        'teams' => $rows('SELECT t.name, m.role, m.joined_at FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id = ?'),
        'matches' => $rows('SELECT m.title, m.format, m.starts_at, v.name AS venue, p.status FROM match_participants p JOIN matches m ON m.id = p.match_id JOIN venues v ON v.id = m.venue_id WHERE p.user_id = ? ORDER BY m.starts_at'),
        'organized_matches' => $rows('SELECT m.title, m.format, m.starts_at, m.status FROM matches m WHERE m.organizer_id = ? ORDER BY m.starts_at'),
        'posts' => $rows('SELECT body, image_url, created_at FROM posts WHERE author_id = ? ORDER BY created_at'),
        'comments' => $rows('SELECT body, created_at FROM post_comments WHERE author_id = ? ORDER BY created_at'),
        'likes' => $rows('SELECT post_id, created_at FROM post_likes WHERE user_id = ?'),
        'ratings_given' => $rows('SELECT match_id, rated_id, stars, best FROM player_ratings WHERE rater_id = ?'),
        // Les notes reçues restent anonymes : on ne dit pas qui les a données.
        'ratings_received' => $rows('SELECT match_id, stars, best FROM player_ratings WHERE rated_id = ?'),
        'payments' => $rows('SELECT match_id, amount_cents, fee_cents, status, refund_cents, created_at, paid_at, refunded_at FROM payments WHERE user_id = ?'),
        'cosmetics' => $rows('SELECT c.name, c.type, uc.acquired_at FROM user_cosmetics uc JOIN cosmetics c ON c.id = uc.cosmetic_id WHERE uc.user_id = ?'),
        'coins' => $rows('SELECT amount, reason, created_at FROM coin_ledger WHERE user_id = ? ORDER BY created_at'),
        'friends' => query(
            'SELECT u.display_name, f.status, IF(f.requester_id = ?, "envoyée", "reçue") AS request, f.created_at, f.accepted_at FROM friendships f
             JOIN users u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id) WHERE f.requester_id = ? OR f.addressee_id = ?',
            [$id, $id, $id, $id]
        )->fetchAll(),
        'notifications' => $rows('SELECT kind, title, body, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY id'),
        'devices' => $rows('SELECT platform, lat, lng, updated_at FROM push_tokens WHERE user_id = ?'),
        'sessions' => $rows('SELECT created_at, last_used_at FROM auth_tokens WHERE user_id = ?'),
    ];
}

/** Ce qui empêche de supprimer le compte tout de suite (message pour le joueur), ou null. */
function deletion_blocker(int $id): ?string
{
    if (one('SELECT 1 AS x FROM organizations WHERE owner_id = ?', [$id])) {
        return "Ton espace pro est relié à Stripe : écris-nous à contact@supercity.fr pour le fermer, puis on supprime ton compte.";
    }
    if (one('SELECT 1 AS x FROM matches WHERE organizer_id = ? AND status <> "cancelled" AND starts_at > UTC_TIMESTAMP()', [$id])) {
        return "Annule d'abord les matchs que tu organises et qui n'ont pas encore eu lieu.";
    }
    if (one('SELECT 1 AS x FROM match_participants p JOIN matches m ON m.id = p.match_id WHERE p.user_id = ? AND m.status <> "cancelled" AND m.starts_at > UTC_TIMESTAMP()', [$id])) {
        return "Désinscris-toi d'abord des matchs à venir.";
    }
    return null;
}

/**
 * Anonymise le compte : plus aucune donnée qui permette de reconnaître le joueur.
 * Les matchs passés restent (pour l'historique des autres), avec « Joueur supprimé » à sa place ;
 * les paiements aussi, sans nom ni e-mail, parce que la loi impose de garder la comptabilité.
 */
function delete_account(array $u): void
{
    $id = (int)$u['id'];
    $files = array_merge([$u['avatar_url']], array_column(query('SELECT image_url FROM posts WHERE author_id = ? AND image_url IS NOT NULL', [$id])->fetchAll(), 'image_url'));
    $email = $u['email'];
    transaction(function () use ($id, $email) {
        // Capitaine : le plus ancien coéquipier reprend l'équipe.
        foreach (query('SELECT id FROM teams WHERE captain_id = ?', [$id])->fetchAll() as $t) {
            $next = one('SELECT user_id FROM team_members WHERE team_id = ? AND user_id <> ? ORDER BY joined_at, user_id LIMIT 1', [$t['id'], $id]);
            if ($next) {
                query('UPDATE teams SET captain_id = ? WHERE id = ?', [$next['user_id'], $t['id']]);
                query('UPDATE team_members SET role = "captain" WHERE team_id = ? AND user_id = ?', [$t['id'], $next['user_id']]);
            }
        }
        query('DELETE FROM team_members WHERE user_id = ?', [$id]);
        foreach (['auth_tokens', 'push_tokens', 'email_codes', 'post_likes', 'post_reports', 'user_cosmetics', 'coin_ledger', 'grade_bonus', 'notifications'] as $table) {
            query("DELETE FROM $table WHERE user_id = ?", [$id]);
        }
        query('DELETE FROM auth_attempts WHERE email = ?', [$email]);
        query('DELETE FROM friendships WHERE requester_id = ? OR addressee_id = ?', [$id, $id]);
        // Les notifications des autres qui citent son pseudo disparaissent aussi.
        query('DELETE FROM notifications WHERE actor_id = ?', [$id]);
        query('DELETE FROM post_comments WHERE author_id = ?', [$id]);
        query('DELETE FROM posts WHERE author_id = ?', [$id]);
        query('DELETE FROM player_ratings WHERE rater_id = ? OR rated_id = ?', [$id, $id]);
        query('DELETE FROM challenges WHERE created_by = ? AND status = "pending"', [$id]);
        query(
            'UPDATE users SET email = ?, password_hash = ?, display_name = "Joueur supprimé", birth_date = NULL, city = NULL, bio = NULL,
               position = NULL, level = NULL, strong_foot = NULL, shirt_number = NULL, favorite_club = NULL, avatar_url = NULL,
               accent = "orange", site_role = "user", suspended_until = NULL, suspended_reason = NULL, notify_events = 0, notify_streaks = 0,
               frame_id = NULL, banner_id = NULL, title_id = NULL, card_stats = NULL, weak_foot = NULL, skill_moves = NULL,
               last_seen_at = NULL, show_presence = 0,
               deleted_at = UTC_TIMESTAMP() WHERE id = ?',
            ["supprime-$id@supercity.invalid", password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT), $id]
        );
    });
    foreach ($files as $f) {
        delete_upload($f);
    }
}

function register_privacy_routes(Router $r): void
{
    // Copie de toutes ses données, envoyée en pièce jointe (JSON) à l'adresse du compte.
    $r->post('/me/export', function () {
        $user = require_user();
        if (count_attempts('export', 'email', $user['email'], 24 * 60, false) >= EXPORT_PER_DAY) {
            too_many('Tu as déjà demandé tes données plusieurs fois aujourd\'hui. Réessaie demain.');
        }
        record_attempt('export', $user['email'], true);
        $json = json_encode(user_export((int)$user['id']), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        send_mail(
            $user['email'],
            'Tes données Supercity',
            "Salut {$user['display_name']},\n\nTu trouveras en pièce jointe une copie de toutes les données que Supercity garde sur toi (fichier JSON, lisible avec un éditeur de texte).\n\nSi tu n'as pas fait cette demande, change ton mot de passe dans l'appli.\n\nL'équipe Supercity",
            null,
            ['name' => 'supercity-mes-donnees.json', 'type' => 'application/json', 'content' => $json]
        );
        respond(202, ['sent_to' => $user['email']]);
    });

    // Suppression définitive du compte, après confirmation du mot de passe : { password }.
    $r->delete('/me', function () {
        $user = require_user();
        $full = one('SELECT * FROM users WHERE id = ?', [$user['id']]);
        $password = (string)(body()['password'] ?? '');
        if (!password_verify($password, $full['password_hash'])) {
            throw new HttpError(422, 'validation_failed', 'Mot de passe incorrect.', ['password' => 'Mot de passe incorrect.']);
        }
        $blocker = deletion_blocker((int)$full['id']);
        if ($blocker) {
            throw new HttpError(409, 'deletion_blocked', $blocker);
        }
        delete_account($full);
        respond(204);
    });
}
