<?php
// Équipes : création, recherche, invitation par code, membres.
declare(strict_types=1);

const FORMATS = ['city5', 'futsal', 'foot8', 'foot11'];

function invite_code(): string
{
    // Sans caractères ambigus (0/O, 1/I).
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

function team_membership(int $teamId, int $userId): ?string
{
    $row = one('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?', [$teamId, $userId]);
    return $row['role'] ?? null;
}

function load_team(int $id): array
{
    return one('SELECT * FROM teams WHERE id = ?', [$id]) ?? not_found('Équipe');
}

function team_view(array $t, ?int $viewerId, bool $withMembers = false): array
{
    $role = $viewerId ? team_membership((int)$t['id'], $viewerId) : null;
    $count = (int)one('SELECT COUNT(*) AS n FROM team_members WHERE team_id = ?', [$t['id']])['n'];
    $out = [
        'id' => (int)$t['id'],
        'name' => $t['name'],
        'city' => $t['city'],
        'logo_url' => $t['logo_url'],
        'usual_format' => $t['usual_format'],
        'captain_id' => (int)$t['captain_id'],
        'members_count' => $count,
        'my_role' => $role,
        'created_at' => iso($t['created_at']),
    ];
    // Le code d'invitation n'est visible que par les membres.
    if ($role !== null) {
        $out['invite_code'] = $t['invite_code'];
    }
    if ($withMembers) {
        $rows = query(
            'SELECT u.*, m.role, m.joined_at FROM team_members m JOIN users u ON u.id = m.user_id
             WHERE m.team_id = ? ORDER BY m.role = "captain" DESC, m.joined_at',
            [$t['id']]
        )->fetchAll();
        $out['members'] = array_map(
            fn($u) => public_user($u) + ['role' => $u['role'], 'joined_at' => iso($u['joined_at'])],
            $rows
        );
    }
    return $out;
}

function register_team_routes(Router $r): void
{
    $r->post('/teams', function () {
        $user = require_user();
        $in = validate(body())
            ->string('name', 2, 60)
            ->string('city', 1, 80, false)
            ->url('logo_url')
            ->enum('usual_format', FORMATS, false)
            ->check();
        $id = transaction(function () use ($in, $user) {
            query(
                'INSERT INTO teams (name, city, logo_url, usual_format, captain_id, invite_code) VALUES (?, ?, ?, ?, ?, ?)',
                [$in['name'], $in['city'] ?? null, $in['logo_url'] ?? null, $in['usual_format'] ?? null, $user['id'], invite_code()]
            );
            $id = (int)db()->lastInsertId();
            query('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, "captain")', [$id, $user['id']]);
            return $id;
        });
        respond(201, team_view(load_team($id), (int)$user['id'], true));
    });

    // Recherche par nom et/ou ville.
    $r->get('/teams', function () {
        $user = require_user();
        [$limit, $offset] = paging();
        $where = [];
        $params = [];
        if (($q = trim((string)($_GET['q'] ?? ''))) !== '') {
            $where[] = 'name LIKE ?';
            $params[] = '%' . addcslashes($q, '%_\\') . '%';
        }
        if (($city = trim((string)($_GET['city'] ?? ''))) !== '') {
            $where[] = 'city = ?';
            $params[] = $city;
        }
        $sql = 'SELECT * FROM teams' . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . " ORDER BY name LIMIT $limit OFFSET $offset";
        $rows = query($sql, $params)->fetchAll();
        respond(200, ['items' => array_map(fn($t) => team_view($t, (int)$user['id']), $rows)]);
    });

    $r->get('/me/teams', function () {
        $user = require_user();
        $rows = query(
            'SELECT t.* FROM teams t JOIN team_members m ON m.team_id = t.id WHERE m.user_id = ? ORDER BY t.name',
            [$user['id']]
        )->fetchAll();
        respond(200, ['items' => array_map(fn($t) => team_view($t, (int)$user['id']), $rows)]);
    });

    $r->get('/teams/(\d+)', function (string $id) {
        $user = require_user();
        respond(200, team_view(load_team((int)$id), (int)$user['id'], true));
    });

    $r->patch('/teams/(\d+)', function (string $id) {
        $user = require_user();
        $team = load_team((int)$id);
        if ((int)$team['captain_id'] !== (int)$user['id']) {
            forbidden('Seul le capitaine peut modifier l\'équipe.');
        }
        $in = validate(body(), true)
            ->string('name', 2, 60)
            ->string('city', 1, 80, false)
            ->url('logo_url')
            ->enum('usual_format', FORMATS, false)
            ->check();
        if ($in) {
            $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($in)));
            query("UPDATE teams SET $sets WHERE id = ?", [...array_values($in), $team['id']]);
        }
        respond(200, team_view(load_team((int)$id), (int)$user['id'], true));
    });

    // Rejoindre avec le code reçu du capitaine.
    $r->post('/teams/join', function () {
        $user = require_user();
        $code = strtoupper(trim((string)(body()['invite_code'] ?? '')));
        $team = one('SELECT * FROM teams WHERE invite_code = ?', [$code])
            ?? throw new HttpError(404, 'invalid_invite_code', 'Code d\'invitation inconnu.');
        query('INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, "player")', [$team['id'], $user['id']]);
        respond(200, team_view($team, (int)$user['id'], true));
    });

    $r->post('/teams/(\d+)/invite-code', function (string $id) {
        $user = require_user();
        $team = load_team((int)$id);
        if ((int)$team['captain_id'] !== (int)$user['id']) {
            forbidden('Seul le capitaine peut changer le code.');
        }
        query('UPDATE teams SET invite_code = ? WHERE id = ?', [invite_code(), $team['id']]);
        respond(200, team_view(load_team((int)$id), (int)$user['id']));
    });

    // Quitter l'équipe (me) ou retirer un joueur (capitaine).
    $r->delete('/teams/(\d+)/members/(me|\d+)', function (string $id, string $member) {
        $user = require_user();
        $team = load_team((int)$id);
        $targetId = $member === 'me' ? (int)$user['id'] : (int)$member;
        $isCaptain = (int)$team['captain_id'] === (int)$user['id'];
        if ($targetId !== (int)$user['id'] && !$isCaptain) {
            forbidden('Seul le capitaine peut retirer un joueur.');
        }
        if (team_membership((int)$team['id'], $targetId) === null) {
            not_found('Membre');
        }
        if ($targetId === (int)$team['captain_id']) {
            $others = (int)one('SELECT COUNT(*) AS n FROM team_members WHERE team_id = ? AND user_id <> ?', [$team['id'], $targetId])['n'];
            if ($others > 0) {
                throw new HttpError(409, 'captain_must_transfer', 'Passe le brassard à un autre joueur avant de quitter l\'équipe.');
            }
            // Dernier joueur : l'équipe disparaît.
            query('DELETE FROM teams WHERE id = ?', [$team['id']]);
            respond(204);
        }
        query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [$team['id'], $targetId]);
        respond(204);
    });

    // Passer le brassard de capitaine.
    $r->post('/teams/(\d+)/captain', function (string $id) {
        $user = require_user();
        $team = load_team((int)$id);
        if ((int)$team['captain_id'] !== (int)$user['id']) {
            forbidden('Seul le capitaine peut passer le brassard.');
        }
        $in = validate(body())->int('user_id', 1, PHP_INT_MAX)->check();
        if (team_membership((int)$team['id'], $in['user_id']) === null) {
            throw new HttpError(422, 'validation_failed', 'Ce joueur n\'est pas dans l\'équipe.', ['user_id' => 'Pas membre.']);
        }
        transaction(function () use ($team, $in, $user) {
            query('UPDATE team_members SET role = "player" WHERE team_id = ? AND user_id = ?', [$team['id'], $user['id']]);
            query('UPDATE team_members SET role = "captain" WHERE team_id = ? AND user_id = ?', [$team['id'], $in['user_id']]);
            query('UPDATE teams SET captain_id = ? WHERE id = ?', [$in['user_id'], $team['id']]);
        });
        respond(200, team_view(load_team((int)$id), (int)$user['id'], true));
    });
}
