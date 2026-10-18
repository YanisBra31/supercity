<?php
// Centre de notifications et amis : la boîte de réception de chaque joueur, les demandes d'ami,
// et le statut des amis (en match, en ligne, vu il y a...).
declare(strict_types=1);

const ONLINE_MINUTES = 5;
const INBOX_LIMIT = 50;
const INBOX_KEEP_DAYS = 90;
const FRIEND_PENDING_MAX = 50;

/**
 * Dépose une notification dans la boîte de réception de ces joueurs, et l'envoie sur leurs téléphones.
 * $push = false quand la notification sur le téléphone part déjà par ailleurs (séries).
 */
function notify(array $userIds, string $kind, string $title, string $body, ?string $url = null, ?int $actorId = null, bool $push = true): void
{
    $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
    if (!$userIds) {
        return;
    }
    try {
        foreach ($userIds as $uid) {
            query(
                'INSERT INTO notifications (user_id, kind, title, body, url, actor_id) VALUES (?, ?, ?, ?, ?, ?)',
                [$uid, $kind, mb_substr($title, 0, 120), mb_substr($body, 0, 300), $url, $actorId]
            );
        }
        if ($push) {
            push_send(push_tokens_of($userIds), $title, $body, $url ? ['url' => $url] : []);
        }
    } catch (Throwable $e) {
        // Une notification ratée ne doit jamais faire échouer l'action du joueur.
        error_log('supercity notify: ' . $e->getMessage());
    }
}

/** Note l'activité du joueur, au plus une fois par minute. */
function touch_presence(array $u): void
{
    if ($u['last_seen_at'] === null || strtotime($u['last_seen_at'] . ' UTC') < time() - 60) {
        query('UPDATE users SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [$u['id']]);
    }
}

/** Petit résumé d'un match pour un statut : où, quand. */
function presence_match(array $m): array
{
    return [
        'id' => (int)$m['id'],
        'title' => $m['title'],
        'format' => $m['format'],
        'venue' => $m['venue_name'],
        'starts_at' => iso($m['starts_at']),
        'ends_at' => iso(gmdate('Y-m-d H:i:s', strtotime($m['starts_at'] . ' UTC') + 60 * (int)$m['duration_min'])),
    ];
}

/**
 * Statut d'un joueur vu par ses amis : « match » s'il joue en ce moment, « online » s'il a utilisé l'appli
 * il y a moins de 5 minutes, sinon « offline ». Avec son prochain match, s'il en a un. Null s'il le cache.
 */
function presence_of(array $u): ?array
{
    if (!(int)($u['show_presence'] ?? 1)) {
        return null;
    }
    $sql = 'SELECT m.id, m.title, m.format, m.starts_at, m.duration_min, v.name AS venue_name FROM match_participants p
            JOIN matches m ON m.id = p.match_id JOIN venues v ON v.id = m.venue_id
            WHERE p.user_id = ? AND p.status = "registered" AND m.status <> "cancelled" AND ';
    $now = one($sql . 'm.starts_at <= UTC_TIMESTAMP() AND m.starts_at + INTERVAL m.duration_min MINUTE > UTC_TIMESTAMP() ORDER BY m.starts_at DESC LIMIT 1', [$u['id']]);
    $next = $now ? null : one($sql . 'm.starts_at > UTC_TIMESTAMP() AND m.starts_at < UTC_TIMESTAMP() + INTERVAL 7 DAY ORDER BY m.starts_at LIMIT 1', [$u['id']]);
    $seen = $u['last_seen_at'] ? strtotime($u['last_seen_at'] . ' UTC') : null;
    return [
        'state' => $now ? 'match' : ($seen !== null && $seen > time() - 60 * ONLINE_MINUTES ? 'online' : 'offline'),
        'last_seen_at' => iso($u['last_seen_at']),
        'match' => $now ? presence_match($now) : null,
        'next_match' => $next ? presence_match($next) : null,
    ];
}

function friendship_row(int $a, int $b): ?array
{
    return one(
        'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
        [$a, $b, $b, $a]
    );
}

/** Lien entre deux joueurs, vu par $viewer : none, outgoing (demande envoyée), incoming (demande reçue) ou friends. */
function friendship_state(int $viewer, int $other): string
{
    $f = friendship_row($viewer, $other);
    if (!$f) {
        return 'none';
    }
    if ($f['status'] === 'accepted') {
        return 'friends';
    }
    return (int)$f['requester_id'] === $viewer ? 'outgoing' : 'incoming';
}

function are_friends(int $a, int $b): bool
{
    return $a !== $b && friendship_state($a, $b) === 'friends';
}

function notification_view(array $n): array
{
    return [
        'id' => (int)$n['id'],
        'kind' => $n['kind'],
        'title' => $n['title'],
        'body' => $n['body'],
        'url' => $n['url'],
        'actor' => $n['actor_id'] !== null && $n['actor_name'] !== null
            ? ['id' => (int)$n['actor_id'], 'display_name' => $n['actor_name'], 'avatar_url' => $n['actor_avatar']]
            : null,
        'created_at' => iso($n['created_at']),
        'read' => $n['read_at'] !== null,
    ];
}

function badge_counts(int $uid): array
{
    return [
        'unread' => (int)one('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', [$uid])['n'],
        'friend_requests' => (int)one(
            'SELECT COUNT(*) AS n FROM friendships f JOIN users u ON u.id = f.requester_id
             WHERE f.addressee_id = ? AND f.status = "pending" AND u.deleted_at IS NULL',
            [$uid]
        )['n'],
    ];
}

/** Rang pour trier les amis : en match, puis en ligne, puis les autres. */
function presence_rank(?array $p): int
{
    return match ($p['state'] ?? null) {
        'match' => 0,
        'online' => 1,
        default => 2,
    };
}

function register_social_routes(Router $r): void
{
    // Boîte de réception : les 50 dernières notifications. Le ménage se fait au passage (90 jours).
    $r->get('/me/inbox', function () {
        $uid = (int)require_user()['id'];
        query('DELETE FROM notifications WHERE user_id = ? AND created_at < UTC_TIMESTAMP() - INTERVAL ' . INBOX_KEEP_DAYS . ' DAY', [$uid]);
        $rows = query(
            'SELECT n.*, a.display_name AS actor_name, a.avatar_url AS actor_avatar FROM notifications n
             LEFT JOIN users a ON a.id = n.actor_id AND a.deleted_at IS NULL
             WHERE n.user_id = ? ORDER BY n.id DESC LIMIT ' . INBOX_LIMIT,
            [$uid]
        )->fetchAll();
        respond(200, ['items' => array_map('notification_view', $rows)] + badge_counts($uid));
    });

    // Marque comme lues certaines notifications ({"ids": [1, 2]}), ou toutes sans corps.
    $r->post('/me/inbox/read', function () {
        $uid = (int)require_user()['id'];
        $ids = body()['ids'] ?? null;
        if (is_array($ids)) {
            $ids = array_values(array_filter(array_map('intval', array_slice($ids, 0, 100)), fn($i) => $i > 0));
            if ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                query("UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE user_id = ? AND read_at IS NULL AND id IN ($in)", [$uid, ...$ids]);
            }
        } else {
            query('UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE user_id = ? AND read_at IS NULL', [$uid]);
        }
        respond(200, badge_counts($uid));
    });

    // Pastilles de l'appli, demandées régulièrement : elles gardent aussi le joueur « en ligne ».
    $r->get('/me/badge', function () {
        respond(200, badge_counts((int)require_user()['id']));
    });

    // Montrer ou non son statut (en ligne, en match) à ses amis.
    $r->patch('/me/presence', function () {
        $user = require_user();
        $in = validate(body())->bool('visible')->check();
        query('UPDATE users SET show_presence = ? WHERE id = ?', [(int)$in['visible'], $user['id']]);
        respond(200, private_user(one('SELECT * FROM users WHERE id = ?', [$user['id']])));
    });

    // Amis (avec leur statut), demandes reçues et demandes envoyées.
    $r->get('/me/friends', function () {
        $uid = (int)require_user()['id'];
        $rows = query(
            'SELECT u.*, f.status AS f_status, f.requester_id AS f_requester, f.created_at AS f_created, f.accepted_at AS f_accepted
             FROM friendships f JOIN users u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
             WHERE (f.requester_id = ? OR f.addressee_id = ?) AND u.deleted_at IS NULL',
            [$uid, $uid, $uid]
        )->fetchAll();
        $friends = $incoming = $outgoing = [];
        foreach ($rows as $u) {
            if ($u['f_status'] === 'accepted') {
                $friends[] = public_user($u) + ['presence' => presence_of($u), 'since' => iso($u['f_accepted'])];
            } elseif ((int)$u['f_requester'] === $uid) {
                $outgoing[] = public_user($u) + ['requested_at' => iso($u['f_created'])];
            } else {
                $incoming[] = public_user($u) + ['requested_at' => iso($u['f_created'])];
            }
        }
        usort($friends, fn($a, $b) => [presence_rank($a['presence']), -strtotime($a['presence']['last_seen_at'] ?? '1970-01-01'), $a['display_name']]
            <=> [presence_rank($b['presence']), -strtotime($b['presence']['last_seen_at'] ?? '1970-01-01'), $b['display_name']]);
        respond(200, ['friends' => $friends, 'incoming' => $incoming, 'outgoing' => $outgoing]);
    });

    // Chercher un joueur par son pseudo, pour l'ajouter.
    $r->get('/users', function () {
        $uid = (int)require_user()['id'];
        $q = trim((string)($_GET['q'] ?? ''));
        if (mb_strlen($q) < 2) {
            respond(200, ['items' => []]);
        }
        $like = '%' . addcslashes($q, '%_\\') . '%';
        $rows = query(
            'SELECT * FROM users WHERE deleted_at IS NULL AND id <> ? AND display_name LIKE ? ORDER BY display_name LIMIT 20',
            [$uid, $like]
        )->fetchAll();
        respond(200, ['items' => array_map(fn($u) => public_user($u) + ['friendship' => friendship_state($uid, (int)$u['id'])], $rows)]);
    });

    // Demander en ami, ou accepter si l'autre joueur l'a déjà demandé.
    $r->post('/users/(\d+)/friend', function (string $id) {
        $me = require_user();
        $uid = (int)$me['id'];
        $other = one('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [(int)$id]) ?? not_found('Joueur');
        $oid = (int)$other['id'];
        if ($oid === $uid) {
            throw new HttpError(422, 'validation_failed', 'Tu ne peux pas t\'ajouter toi-même.');
        }
        $f = friendship_row($uid, $oid);
        if ($f && $f['status'] === 'pending' && (int)$f['requester_id'] === $oid) {
            query('UPDATE friendships SET status = "accepted", accepted_at = UTC_TIMESTAMP() WHERE requester_id = ? AND addressee_id = ?', [$oid, $uid]);
            query('UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE user_id = ? AND kind = "friend_request" AND actor_id = ? AND read_at IS NULL', [$uid, $oid]);
            notify([$oid], 'friend_accepted', 'Nouvel ami', "{$me['display_name']} a accepté ta demande. Vous êtes amis !", "/user/$uid", $uid);
        } elseif (!$f) {
            $pending = (int)one('SELECT COUNT(*) AS n FROM friendships WHERE requester_id = ? AND status = "pending"', [$uid])['n'];
            if ($pending >= FRIEND_PENDING_MAX) {
                throw new HttpError(429, 'too_many_requests', 'Tu as déjà beaucoup de demandes en attente. Attends quelques réponses.');
            }
            query('INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)', [$uid, $oid]);
            notify([$oid], 'friend_request', "Demande d'ami", "{$me['display_name']} veut t'ajouter en ami.", '/friends', $uid);
        }
        respond(200, ['friendship' => friendship_state($uid, $oid)]);
    });

    // Retirer un ami, annuler sa demande ou refuser celle reçue.
    $r->delete('/users/(\d+)/friend', function (string $id) {
        $uid = (int)require_user()['id'];
        $oid = (int)$id;
        $f = friendship_row($uid, $oid);
        if ($f) {
            query('DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ?', [$f['requester_id'], $f['addressee_id']]);
            if ($f['status'] === 'pending') {
                // La demande retirée ou refusée disparaît de la boîte de l'autre.
                query('DELETE FROM notifications WHERE user_id = ? AND kind = "friend_request" AND actor_id = ?', [$f['addressee_id'], $f['requester_id']]);
            }
        }
        respond(200, ['friendship' => 'none']);
    });
}
