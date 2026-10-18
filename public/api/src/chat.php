<?php
// Discussions : une par match (les joueurs inscrits, en attente ou sur liste d'attente, et l'organisateur)
// et une par équipe (ses membres). Les messages des matchs sont effacés 90 jours après le match.
declare(strict_types=1);

const CHAT_PAGE = 100;
const CHAT_PER_MINUTE = 15;
const CHAT_PUSH_MINUTES = 10;
const CHAT_KEEP_DAYS = 90;

/** Qui fait partie d'une discussion (identifiants), et son titre. 404 si le match ou l'équipe n'existe pas. */
function chat_members(string $scope, int $id): array
{
    if ($scope === 'team') {
        $t = load_team($id);
        $ids = array_column(query('SELECT user_id FROM team_members WHERE team_id = ?', [$id])->fetchAll(), 'user_id');
        return [array_map('intval', $ids), $t['name']];
    }
    $m = load_match($id);
    $ids = array_column(query('SELECT user_id FROM match_participants WHERE match_id = ? AND status <> "withdrawn"', [$id])->fetchAll(), 'user_id');
    $ids[] = $m['organizer_id'];
    $venue = one('SELECT name FROM venues WHERE id = ?', [$m['venue_id']]);
    return [array_values(array_unique(array_map('intval', $ids))), $m['title'] ?: 'Match à ' . ($venue['name'] ?? 'Supercity')];
}

function require_chat(string $scope, int $id, int $uid): array
{
    [$members, $title] = chat_members($scope, $id);
    if (!in_array($uid, $members, true)) {
        forbidden($scope === 'team' ? 'La discussion est réservée aux membres de l\'équipe.' : 'La discussion est réservée aux joueurs du match.');
    }
    return [$members, $title];
}

/** Messages non lus d'une discussion pour ce joueur (les siens ne comptent pas). */
function chat_unread(string $scope, int $id, int $uid): int
{
    $read = one('SELECT last_read_id FROM chat_reads WHERE user_id = ? AND scope = ? AND scope_id = ?', [$uid, $scope, $id]);
    return (int)one(
        'SELECT COUNT(*) AS n FROM chat_messages WHERE scope = ? AND scope_id = ? AND id > ? AND author_id <> ?',
        [$scope, $id, (int)($read['last_read_id'] ?? 0), $uid]
    )['n'];
}

function chat_message_view(array $m, int $viewerId): array
{
    return [
        'id' => (int)$m['id'],
        'body' => $m['body'],
        'created_at' => iso($m['created_at']),
        'author' => [
            'id' => (int)$m['author_id'],
            'display_name' => $m['display_name'],
            'avatar_url' => $m['avatar_url'],
            'accent' => $m['accent'] ?? 'orange',
        ],
        'mine' => (int)$m['author_id'] === $viewerId,
    ];
}

/** Ménage : les discussions des matchs joués il y a plus de 90 jours. */
function prune_chats(): void
{
    query(
        'DELETE c FROM chat_messages c JOIN matches m ON c.scope = "match" AND m.id = c.scope_id
         WHERE m.starts_at < UTC_TIMESTAMP() - INTERVAL ' . CHAT_KEEP_DAYS . ' DAY'
    );
}

function register_chat_routes(Router $r): void
{
    // Messages d'une discussion, du plus ancien au plus récent. ?after=ID pour ne recevoir que les nouveaux.
    $r->get('/chats/(match|team)/(\d+)/messages', function (string $scope, string $id) {
        $uid = (int)require_user()['id'];
        [$members, $title] = require_chat($scope, (int)$id, $uid);
        $after = max(0, (int)($_GET['after'] ?? 0));
        $sql = 'SELECT c.*, u.display_name, u.avatar_url, u.accent FROM chat_messages c JOIN users u ON u.id = c.author_id
                WHERE c.scope = ? AND c.scope_id = ?';
        $rows = $after
            ? query("$sql AND c.id > ? ORDER BY c.id LIMIT " . CHAT_PAGE, [$scope, (int)$id, $after])->fetchAll()
            : array_reverse(query("$sql ORDER BY c.id DESC LIMIT " . CHAT_PAGE, [$scope, (int)$id])->fetchAll());
        if ($rows) {
            // Lu : on pourra le prévenir à nouveau dès le prochain message.
            query(
                'INSERT INTO chat_reads (user_id, scope, scope_id, last_read_id) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id)), pushed_at = NULL',
                [$uid, $scope, (int)$id, (int)end($rows)['id']]
            );
        }
        respond(200, [
            'title' => $title,
            'members_count' => count($members),
            'items' => array_map(fn($m) => chat_message_view($m, $uid), $rows),
        ]);
    });

    $r->post('/chats/(match|team)/(\d+)/messages', function (string $scope, string $id) {
        $user = require_user();
        $uid = (int)$user['id'];
        [$members, $title] = require_chat($scope, (int)$id, $uid);
        $in = validate(body())->string('body', 1, 500)->check();
        $recent = (int)one('SELECT COUNT(*) AS n FROM chat_messages WHERE author_id = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 1 MINUTE', [$uid])['n'];
        if ($recent >= CHAT_PER_MINUTE) {
            throw new HttpError(429, 'too_many_requests', 'Doucement ! Attends un peu avant d\'envoyer un autre message.');
        }
        query('INSERT INTO chat_messages (scope, scope_id, author_id, body) VALUES (?, ?, ?, ?)', [$scope, (int)$id, $uid, $in['body']]);
        $msgId = (int)db()->lastInsertId();
        query(
            'INSERT INTO chat_reads (user_id, scope, scope_id, last_read_id) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE last_read_id = VALUES(last_read_id), pushed_at = NULL',
            [$uid, $scope, (int)$id, $msgId]
        );

        // Prévient les autres sur leur téléphone, au plus une fois toutes les 10 minutes tant qu'ils n'ont pas lu.
        try {
            $others = array_values(array_filter($members, fn($m) => $m !== $uid));
            $toPush = [];
            foreach ($others as $o) {
                $row = one('SELECT pushed_at FROM chat_reads WHERE user_id = ? AND scope = ? AND scope_id = ?', [$o, $scope, (int)$id]);
                if (!$row || $row['pushed_at'] === null || strtotime($row['pushed_at'] . ' UTC') < time() - 60 * CHAT_PUSH_MINUTES) {
                    $toPush[] = $o;
                    query(
                        'INSERT INTO chat_reads (user_id, scope, scope_id, pushed_at) VALUES (?, ?, ?, UTC_TIMESTAMP())
                         ON DUPLICATE KEY UPDATE pushed_at = UTC_TIMESTAMP()',
                        [$o, $scope, (int)$id]
                    );
                }
            }
            $preview = mb_strlen($in['body']) > 120 ? mb_substr($in['body'], 0, 117) . '…' : $in['body'];
            push_send(push_tokens_of($toPush), $title, "{$user['display_name']} : $preview", ['url' => "/chat/$scope/$id"]);
        } catch (Throwable $e) {
            error_log('supercity chat push: ' . $e->getMessage());
        }

        $m = one('SELECT c.*, u.display_name, u.avatar_url, u.accent FROM chat_messages c JOIN users u ON u.id = c.author_id WHERE c.id = ?', [$msgId]);
        respond(201, chat_message_view($m, $uid));
    });

    // Effacer un message : son auteur, ou la modération.
    $r->delete('/chats/messages/(\d+)', function (string $id) {
        $user = require_user();
        $m = one('SELECT * FROM chat_messages WHERE id = ?', [(int)$id]) ?? not_found('Message');
        if ((int)$m['author_id'] !== (int)$user['id'] && !is_moderator($user)) {
            forbidden('Tu ne peux effacer que tes propres messages.');
        }
        query('DELETE FROM chat_messages WHERE id = ?', [$m['id']]);
        respond(204);
    });
}
