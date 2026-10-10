<?php
// Fil d'actualité : publications (texte, photo), j'aime, commentaires, signalements.
declare(strict_types=1);

const POSTS_PER_HOUR = 20;
const REPORTS_TO_HIDE = 3;

function load_post(int $id): array
{
    return one('SELECT * FROM posts WHERE id = ?', [$id]) ?? not_found('Publication');
}

/** Publications à afficher, avec auteur, compteurs et ce que le lecteur en a fait. */
function post_views(array $rows, int $viewerId): array
{
    if (!$rows) {
        return [];
    }
    $ids = array_map(fn($p) => (int)$p['id'], $rows);
    $in = implode(',', $ids);
    $likes = array_column(query("SELECT post_id, COUNT(*) AS n FROM post_likes WHERE post_id IN ($in) GROUP BY post_id")->fetchAll(), 'n', 'post_id');
    $comments = array_column(query("SELECT post_id, COUNT(*) AS n FROM post_comments WHERE post_id IN ($in) GROUP BY post_id")->fetchAll(), 'n', 'post_id');
    $mine = array_flip(array_column(query("SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN ($in)", [$viewerId])->fetchAll(), 'post_id'));
    return array_map(function ($p) use ($likes, $comments, $mine, $viewerId) {
        $author = one('SELECT * FROM users WHERE id = ?', [$p['author_id']]);
        $match = $p['match_id'] !== null ? one('SELECT * FROM matches WHERE id = ?', [$p['match_id']]) : null;
        return [
            'id' => (int)$p['id'],
            'kind' => $p['kind'],
            'author' => public_user($author),
            'body' => $p['body'],
            'image_url' => $p['image_url'],
            'team' => $p['team_id'] !== null ? team_brief((int)$p['team_id']) : null,
            'match' => $match ? match_view($match, $viewerId) : null,
            'likes_count' => (int)($likes[$p['id']] ?? 0),
            'comments_count' => (int)($comments[$p['id']] ?? 0),
            'liked' => isset($mine[$p['id']]),
            'is_mine' => (int)$p['author_id'] === $viewerId,
            'created_at' => iso($p['created_at']),
        ];
    }, $rows);
}

function comment_view(array $c, int $viewerId, int $postAuthorId): array
{
    $author = one('SELECT * FROM users WHERE id = ?', [$c['author_id']]);
    return [
        'id' => (int)$c['id'],
        'author' => public_user($author),
        'body' => $c['body'],
        'created_at' => iso($c['created_at']),
        'can_delete' => (int)$c['author_id'] === $viewerId || $postAuthorId === $viewerId,
    ];
}

/** Publication automatique quand un défi est relevé. */
function post_challenge_accepted(int $authorId, int $fromTeam, int $toTeam, int $matchId): void
{
    $a = load_team($fromTeam)['name'];
    $b = load_team($toTeam)['name'];
    query(
        'INSERT INTO posts (author_id, kind, body, team_id, match_id) VALUES (?, "challenge", ?, ?, ?)',
        [$authorId, "Défi relevé ! $b affronte $a. Venez nombreux 🔥", $toTeam, $matchId]
    );
}

function register_feed_routes(Router $r): void
{
    // ?scope=all (tout le monde) ou teams (mes équipes) ; ?author_id= pour un joueur ; pagination par ?before_id=.
    $r->get('/feed', function () {
        $user = require_user();
        $uid = (int)$user['id'];
        $limit = min(30, max(1, (int)($_GET['limit'] ?? 20)));
        $where = ['(SELECT COUNT(*) FROM post_reports r WHERE r.post_id = p.id) < ' . REPORTS_TO_HIDE];
        // Ce que j'ai signalé disparaît de mon fil.
        $where[] = 'NOT EXISTS (SELECT 1 FROM post_reports r2 WHERE r2.post_id = p.id AND r2.user_id = ?)';
        $params = [$uid];
        if (($before = (int)($_GET['before_id'] ?? 0)) > 0) {
            $where[] = 'p.id < ?';
            $params[] = $before;
        }
        if (($author = (int)($_GET['author_id'] ?? 0)) > 0) {
            $where[] = 'p.author_id = ?';
            $params[] = $author;
        }
        if (($_GET['scope'] ?? 'all') === 'teams') {
            // Mes publications, celles de mes coéquipiers, et celles qui citent une de mes équipes.
            $where[] = '(p.author_id = ? OR p.author_id IN (SELECT m2.user_id FROM team_members m1 JOIN team_members m2 ON m2.team_id = m1.team_id WHERE m1.user_id = ?)
                         OR p.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?))';
            array_push($params, $uid, $uid, $uid);
        }
        $rows = query('SELECT p.* FROM posts p WHERE ' . implode(' AND ', $where) . " ORDER BY p.id DESC LIMIT $limit", $params)->fetchAll();
        respond(200, ['items' => post_views($rows, $uid)]);
    });

    // Corps JSON {body, team_id} ou multipart (champs body, team_id et photo).
    $r->post('/posts', function () {
        $user = require_user();
        $uid = (int)$user['id'];
        $multipart = str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data');
        $data = $multipart ? $_POST : body();
        if (isset($data['team_id']) && is_string($data['team_id'])) {
            $data['team_id'] = $data['team_id'] === '' ? null : (int)$data['team_id'];
        }
        $in = validate($data)->string('body', 1, 1000, false)->int('team_id', 1, PHP_INT_MAX, false)->check();
        $hasPhoto = $multipart && isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE;
        if (!isset($in['body']) && !$hasPhoto) {
            throw new HttpError(422, 'validation_failed', 'Publication vide.', ['body' => 'Écris quelque chose ou ajoute une photo.']);
        }
        if (isset($in['team_id']) && team_membership($in['team_id'], $uid) === null) {
            throw new HttpError(422, 'validation_failed', 'Tu dois faire partie de cette équipe.', ['team_id' => 'Pas membre de cette équipe.']);
        }
        $recent = (int)one('SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND kind = "post" AND created_at > UTC_TIMESTAMP() - INTERVAL 1 HOUR', [$uid])['n'];
        if ($recent >= POSTS_PER_HOUR) {
            too_many('Tu as beaucoup publié. Fais une pause et réessaie dans une heure.');
        }
        $image = $hasPhoto ? save_uploaded_image('post', 'fit') : null;
        query('INSERT INTO posts (author_id, body, image_url, team_id) VALUES (?, ?, ?, ?)', [$uid, $in['body'] ?? null, $image, $in['team_id'] ?? null]);
        respond(201, post_views([load_post((int)db()->lastInsertId())], $uid)[0]);
    });

    $r->get('/posts/(\d+)', function (string $id) {
        $user = require_user();
        respond(200, post_views([load_post((int)$id)], (int)$user['id'])[0]);
    });

    $r->delete('/posts/(\d+)', function (string $id) {
        $user = require_user();
        $p = load_post((int)$id);
        if ((int)$p['author_id'] !== (int)$user['id']) {
            forbidden('Tu ne peux supprimer que tes publications.');
        }
        delete_upload($p['image_url']);
        query('DELETE FROM posts WHERE id = ?', [$p['id']]);
        respond(204);
    });

    $r->post('/posts/(\d+)/like', function (string $id) {
        $user = require_user();
        $p = load_post((int)$id);
        query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [$p['id'], $user['id']]);
        respond(200, post_views([$p], (int)$user['id'])[0]);
    });

    $r->delete('/posts/(\d+)/like', function (string $id) {
        $user = require_user();
        $p = load_post((int)$id);
        query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [$p['id'], $user['id']]);
        respond(200, post_views([$p], (int)$user['id'])[0]);
    });

    $r->get('/posts/(\d+)/comments', function (string $id) {
        $user = require_user();
        $p = load_post((int)$id);
        $rows = query('SELECT * FROM post_comments WHERE post_id = ? ORDER BY id LIMIT 200', [$p['id']])->fetchAll();
        respond(200, ['items' => array_map(fn($c) => comment_view($c, (int)$user['id'], (int)$p['author_id']), $rows)]);
    });

    $r->post('/posts/(\d+)/comments', function (string $id) {
        $user = require_user();
        $p = load_post((int)$id);
        $in = validate(body())->string('body', 1, 500)->check();
        query('INSERT INTO post_comments (post_id, author_id, body) VALUES (?, ?, ?)', [$p['id'], $user['id'], $in['body']]);
        $c = one('SELECT * FROM post_comments WHERE id = ?', [(int)db()->lastInsertId()]);
        respond(201, comment_view($c, (int)$user['id'], (int)$p['author_id']));
    });

    $r->delete('/comments/(\d+)', function (string $id) {
        $user = require_user();
        $c = one('SELECT c.*, p.author_id AS post_author FROM post_comments c JOIN posts p ON p.id = c.post_id WHERE c.id = ?', [(int)$id]) ?? not_found('Commentaire');
        if ((int)$c['author_id'] !== (int)$user['id'] && (int)$c['post_author'] !== (int)$user['id']) {
            forbidden('Tu ne peux pas supprimer ce commentaire.');
        }
        query('DELETE FROM post_comments WHERE id = ?', [$c['id']]);
        respond(204);
    });

    $r->post('/posts/(\d+)/report', function (string $id) {
        $user = require_user();
        $p = load_post((int)$id);
        $in = validate(body())->string('reason', 1, 200, false)->check();
        query('INSERT IGNORE INTO post_reports (post_id, user_id, reason) VALUES (?, ?, ?)', [$p['id'], $user['id'], $in['reason'] ?? null]);
        respond(204);
    });
}
