<?php
// Tests de bout en bout de l'API, sur une base de test VIDÉE à chaque lancement.
// Usage : SUPERCITY_CONFIG=chemin/config-test.php php tests/api_test.php http://127.0.0.1:8093/api/v1
declare(strict_types=1);

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8093/api/v1', '/');
$config = require getenv('SUPERCITY_CONFIG');
$pdo = new PDO("mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4", $config['user'], $config['password']);
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach (['grade_bonus', 'player_ratings', 'coin_ledger', 'user_cosmetics', 'streak_alerts', 'push_tokens', 'bonus_events', 'payments', 'organizations', 'post_reports', 'post_comments', 'post_likes', 'posts', 'challenges', 'email_codes', 'auth_attempts', 'match_participants', 'matches', 'venues', 'team_members', 'teams', 'auth_tokens', 'users'] as $t) {
    $pdo->exec("TRUNCATE $t");
}
$pdo->exec('DELETE FROM cosmetics WHERE created_by IS NOT NULL');
$pdo->exec('UPDATE cosmetics SET retired = 0');
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

const PASS = 'Crampons-2026';
@unlink($config['mail_log']);

/** Dernier code à 6 chiffres envoyé à cette adresse. */
function last_code(string $email): string
{
    global $config;
    $code = '';
    foreach (file($config['mail_log']) ?: [] as $line) {
        $m = json_decode($line, true);
        if ($m['to'] === $email && preg_match('/\b(\d{6})\b/', $m['text'], $x)) {
            $code = $x[1];
        }
    }
    return $code;
}

$passed = 0;
$failed = 0;

function api(string $method, string $path, ?array $body = null, ?string $token = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = "Authorization: Bearer $token";
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body === null ? null : json_encode($body),
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [$status, json_decode((string)$raw, true)];
}

/** Envoie un fichier en multipart (champ `photo`). */
function upload(string $path, string $file, string $type, ?string $token, string $method = 'POST'): array
{
    global $base;
    $ch = curl_init($base . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
        CURLOPT_POSTFIELDS => ['photo' => new CURLFile($file, $type, basename($file))],
    ]);
    $raw = curl_exec($ch);
    return [curl_getinfo($ch, CURLINFO_HTTP_CODE), json_decode((string)$raw, true)];
}

/** Publication multipart (texte + photo). */
function post_with_photo(string $text, string $file, string $token): array
{
    global $base;
    $ch = curl_init($base . '/posts');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
        CURLOPT_POSTFIELDS => ['body' => $text, 'photo' => new CURLFile($file, 'image/jpeg', 'photo.jpg')],
    ]);
    $raw = curl_exec($ch);
    return [curl_getinfo($ch, CURLINFO_HTTP_CODE), json_decode((string)$raw, true)];
}

function check(string $label, bool $ok, mixed $debug = null): void
{
    global $passed, $failed;
    if ($ok) {
        $passed++;
        echo "  ok   $label\n";
    } else {
        $failed++;
        echo "  FAIL $label\n";
        if ($debug !== null) {
            echo '       ' . json_encode($debug, JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
}

function user(string $name, string $email): array
{
    [$s, $r] = api('POST', '/auth/register', ['email' => $email, 'password' => PASS, 'display_name' => $name, 'level' => 3, 'birth_date' => '1998-05-12', 'accept_terms' => true]);
    check("inscription de $name", $s === 201 && isset($r['token']), $r);
    return [$r['token'] ?? '', $r['user']['id'] ?? 0];
}

echo "Comptes\n";
[$s, $r] = api('POST', '/auth/register', ['email' => 'pas-un-mail', 'password' => 'court', 'display_name' => 'Y']);
check('refuse un formulaire invalide', $s === 422 && isset($r['fields']['email'], $r['fields']['password'], $r['fields']['display_name']), $r);
[$yassin, $yassinId] = user('Yassin', 'yassin@example.fr');
[$s, $r] = api('POST', '/auth/register', ['email' => 'YASSIN@example.fr', 'password' => PASS, 'display_name' => 'Doublon', 'birth_date' => '2000-01-01', 'accept_terms' => true]);
check('refuse un e-mail déjà pris', $s === 409, $r);
[$s, $r] = api('POST', '/auth/login', ['email' => 'yassin@example.fr', 'password' => 'mauvais']);
check('refuse un mauvais mot de passe', $s === 401, $r);
[$s, $r] = api('POST', '/auth/login', ['email' => 'Yassin@Example.fr', 'password' => PASS]);
check('connexion', $s === 200 && isset($r['token']), $r);
$second = $r['token'] ?? '';
[$s, $r] = api('PATCH', '/me', ['city' => 'Toulouse', 'position' => 'attaquant', 'strong_foot' => 'gauche'], $yassin);
check('modifie le profil', $s === 200 && $r['city'] === 'Toulouse' && $r['position'] === 'attaquant', $r);
[$s, $r] = api('PATCH', '/me', ['display_name' => null], $yassin);
check('refuse un pseudo vide', $s === 422, $r);
[$s] = api('POST', '/auth/logout', null, $second);
[$s2] = api('GET', '/me', null, $second);
check('déconnexion invalide le jeton', $s === 204 && $s2 === 401);
[$s, $r] = api('GET', '/me', null, $yassin);
check('l\'autre session reste valide', $s === 200 && $r['email'] === 'yassin@example.fr', $r);

echo "Sécurité des comptes\n";
$form = fn(array $over) => $over + ['email' => 'nina@example.fr', 'password' => PASS, 'display_name' => 'Nina', 'birth_date' => '2001-03-04', 'accept_terms' => true];
foreach ([
    'mot de passe trop court' => ['password' => 'Court-1'],
    'mot de passe sans chiffre' => ['password' => 'Crampons-sans-chiffre'],
    'mot de passe trop courant' => ['password' => 'motdepasse123'],
    'mot de passe avec le pseudo' => ['password' => 'Nina-2026-foot', 'display_name' => 'Nina'],
] as $label => $over) {
    [$s, $r] = api('POST', '/auth/register', $form($over));
    check("refuse un $label", $s === 422 && isset($r['fields']['password']), $r);
}
[$s, $r] = api('POST', '/auth/register', $form(['birth_date' => date('Y-m-d', strtotime('-12 years'))]));
check('refuse un joueur de moins de 15 ans', $s === 422 && str_contains($r['fields']['birth_date'] ?? '', '15 ans'), $r);
[$s, $r] = api('POST', '/auth/register', $form(['birth_date' => '2001-02-30']));
check('refuse une date impossible', $s === 422 && isset($r['fields']['birth_date']), $r);
[$s, $r] = api('POST', '/auth/register', $form(['accept_terms' => false]));
check('exige les conditions d\'utilisation', $s === 422 && isset($r['fields']['accept_terms']), $r);
[$s, $r] = api('POST', '/auth/register', $form([]));
$nina = $r['token'] ?? '';
check('inscription valide, e-mail pas encore vérifié', $s === 201 && $r['user']['email_verified'] === false && $r['user']['birth_date'] === '2001-03-04', $r);
$code = last_code('nina@example.fr');
check('un code de vérification est envoyé par e-mail', strlen($code) === 6);
[$s, $r] = api('POST', '/auth/verify-email', ['code' => $code === '000000' ? '111111' : '000000'], $nina);
check('refuse un code faux', $s === 422, $r);
[$s, $r] = api('POST', '/auth/verify-email', ['code' => $code], $nina);
check('vérifie l\'e-mail avec le bon code', $s === 200 && $r['email_verified'] === true, $r);
[$s, $r] = api('POST', '/auth/verify-email', ['code' => $code], $nina);
check('le code ne sert qu\'une fois (déjà vérifié)', $s === 200 && $r['email_verified'] === true, $r);

for ($i = 0; $i < 5; $i++) {
    api('POST', '/auth/login', ['email' => 'nina@example.fr', 'password' => 'Mauvais-123']);
}
[$s, $r] = api('POST', '/auth/login', ['email' => 'nina@example.fr', 'password' => PASS]);
check('bloque après 5 mots de passe faux, même avec le bon', $s === 429, $r);

[$s] = api('POST', '/auth/password/forgot', ['email' => 'inconnu@example.fr']);
check('mot de passe oublié ne révèle pas si le compte existe', $s === 204);
[$s] = api('POST', '/auth/password/forgot', ['email' => 'nina@example.fr']);
$reset = last_code('nina@example.fr');
check('envoie un code de réinitialisation', $s === 204 && strlen($reset) === 6 && $reset !== $code);
[$s, $r] = api('POST', '/auth/password/reset', ['email' => 'nina@example.fr', 'code' => $reset, 'password' => 'faible']);
check('refuse un nouveau mot de passe faible (le code reste valable)', $s === 422 && isset($r['fields']['password']), $r);
[$s, $r] = api('POST', '/auth/password/forgot', ['email' => 'nina@example.fr']);
$reset = last_code('nina@example.fr');
[$s, $r] = api('POST', '/auth/password/reset', ['email' => 'nina@example.fr', 'code' => $reset, 'password' => 'Lucarne-du-87']);
check('réinitialise le mot de passe et reconnecte', $s === 200 && isset($r['token']), $r);
$nina2 = $r['token'] ?? '';
[$s] = api('GET', '/me', null, $nina);
check('les anciennes sessions sont coupées', $s === 401);
[$s] = api('POST', '/auth/password/forgot', ['email' => 'nina@example.fr']);
[$s, $r] = api('POST', '/auth/password/forgot', ['email' => 'nina@example.fr']);
check('limite les e-mails envoyés sans le révéler', $s === 204 && substr_count(file_get_contents($config['mail_log']), 'nina@example.fr') === 3);
$mails = array_map(fn($l) => json_decode($l, true), file($config['mail_log']));
$last = end($mails);
check('e-mail mis en page : code en grand, version texte gardée', str_contains($last['html'] ?? '', '<!doctype html>') && str_contains($last['html'], implode('&#8202;', str_split(last_code($last['to']))))
    && str_contains($last['text'], last_code($last['to'])) && !str_contains($last['html'], '<script'), $last['subject'] ?? $last);

[$s, $r] = api('POST', '/me/password', ['current_password' => 'faux', 'new_password' => 'Petit-pont-22'], $nina2);
check('changer de mot de passe exige l\'actuel', $s === 422 && isset($r['fields']['current_password']), $r);
[$s] = api('POST', '/me/password', ['current_password' => 'Lucarne-du-87', 'new_password' => 'Petit-pont-22'], $nina2);
[$s2] = api('GET', '/me', null, $nina2);
check('change le mot de passe et garde la session', $s === 204 && $s2 === 200);

[$karim, $karimId] = user('Karim', 'karim@example.fr');
[$lea, $leaId] = user('Léa', 'lea@example.fr');
[$sam, $samId] = user('Sam', 'sam@example.fr');

echo "Équipes\n";
[$s, $team] = api('POST', '/teams', ['name' => 'Cartel Narvalo', 'city' => 'Toulouse', 'usual_format' => 'city5'], $yassin);
check('crée une équipe, le créateur est capitaine', $s === 201 && $team['my_role'] === 'captain' && strlen($team['invite_code']) === 8, $team);
$teamId = $team['id'];
[$s, $r] = api('GET', "/teams/$teamId", null, $karim);
check('un non-membre ne voit pas le code', $s === 200 && !isset($r['invite_code']) && $r['members_count'] === 1, $r);
[$s, $r] = api('POST', '/teams/join', ['invite_code' => strtolower($team['invite_code'])], $karim);
check('rejoint avec le code', $s === 200 && $r['my_role'] === 'player' && $r['members_count'] === 2, $r);
[$s, $r] = api('POST', '/teams/join', ['invite_code' => 'ZZZZZZZZ'], $lea);
check('refuse un code inconnu', $s === 404, $r);
[$s, $r] = api('PATCH', "/teams/$teamId", ['name' => 'Piratage'], $karim);
check('seul le capitaine modifie', $s === 403, $r);
[$s, $r] = api('GET', '/teams?q=narv', null, $lea);
check('recherche par nom', $s === 200 && count($r['items']) === 1, $r);
[$s, $r] = api('DELETE', "/teams/$teamId/members/me", null, $yassin);
check('le capitaine ne peut pas partir sans passer le brassard', $s === 409, $r);
[$s, $r] = api('POST', "/teams/$teamId/captain", ['user_id' => $karimId], $yassin);
check('passe le brassard', $s === 200 && $r['captain_id'] === $karimId && $r['my_role'] === 'player', $r);
[$s, $r] = api('POST', "/teams/$teamId/captain", ['user_id' => $yassinId], $karim);
check('rend le brassard', $s === 200 && $r['captain_id'] === $yassinId, $r);
[$s, $r] = api('GET', '/me/teams', null, $karim);
check('mes équipes', $s === 200 && count($r['items']) === 1, $r);

echo "Terrains\n";
[$s, $v1] = api('POST', '/venues', ['name' => 'City stade Bagatelle', 'address' => 'Rue Bagatelle, 31100 Toulouse', 'city' => 'Toulouse', 'lat' => 43.5847, 'lng' => 1.4203, 'surface' => 'city'], $yassin);
check('ajoute un terrain', $s === 201 && $v1['surface'] === 'city', $v1);
[$s, $v2] = api('POST', '/venues', ['name' => 'Five Toulouse Nord', 'address' => 'Avenue des États-Unis, Toulouse', 'lat' => 43.6450, 'lng' => 1.4300, 'surface' => 'synthetique', 'covered' => true], $karim);
[$s, $v3] = api('POST', '/venues', ['name' => 'Stade de Bordeaux', 'address' => 'Quai de Bacalan, Bordeaux', 'lat' => 44.8378, 'lng' => -0.5792, 'surface' => 'herbe'], $karim);
[$s, $r] = api('POST', '/venues', ['name' => 'Nulle part', 'address' => 'Quelque part', 'lat' => 120, 'lng' => 0], $karim);
check('refuse une latitude impossible', $s === 422 && isset($r['fields']['lat']), $r);
[$s, $r] = api('GET', '/venues?lat=43.6&lng=1.44&radius_km=20', null, $lea);
$names = array_column($r['items'] ?? [], 'name');
check('terrains autour de Toulouse, du plus proche au plus loin', $s === 200 && $names === ['City stade Bagatelle', 'Five Toulouse Nord'], $r);

echo "Personnalisation\n";
$tmp = sys_get_temp_dir();
$img = imagecreatetruecolor(900, 600);
imagefill($img, 0, 0, imagecolorallocate($img, 255, 82, 35));
imagejpeg($img, "$tmp/sc-photo.jpg");
imagepng($img, "$tmp/sc-logo.png");
file_put_contents("$tmp/sc-faux.jpg", "<?php echo 'pirate';");
[$s, $r] = api('PATCH', '/me', ['bio' => 'Milieu box-to-box, toujours chaud le dimanche.', 'shirt_number' => 8, 'favorite_club' => 'Toulouse FC', 'accent' => 'bleu'], $yassin);
check('profil : bio, numéro, club, couleur', $s === 200 && $r['shirt_number'] === 8 && $r['accent'] === 'bleu' && $r['favorite_club'] === 'Toulouse FC', $r);
[$s, $r] = api('PATCH', '/me', ['shirt_number' => 120, 'accent' => 'rose'], $yassin);
check('refuse un numéro ou une couleur hors liste', $s === 422 && isset($r['fields']['shirt_number'], $r['fields']['accent']), $r);
[$s, $r] = upload('/me/avatar', "$tmp/sc-photo.jpg", 'image/jpeg', $yassin);
$avatar = $r['avatar_url'] ?? '';
$size = $avatar ? getimagesize($avatar) : false;
check('photo de profil recadrée en carré 512 px', $s === 200 && $size && $size[0] === 512 && $size[1] === 512, $r);
[$s, $r] = upload('/me/avatar', "$tmp/sc-faux.jpg", 'image/jpeg', $yassin);
check('refuse un faux fichier image', $s === 422 && isset($r['fields']['photo']), $r);
[$s, $r] = upload('/me/avatar', "$tmp/sc-photo.jpg", 'image/jpeg', $yassin);
check('nouvelle photo : l\'ancienne est supprimée', $s === 200 && @file_get_contents($avatar) === false, $r);
[$s, $r] = api('POST', '/me/avatar', ['photo_base64' => base64_encode(file_get_contents("$tmp/sc-photo.jpg"))], $yassin);
$size = !empty($r['avatar_url']) ? getimagesize($r['avatar_url']) : false;
check('photo de profil envoyée en base64 (appli téléphone)', $s === 200 && $size && $size[0] === 512, $r);
[$s, $r] = api('POST', '/me/avatar', ['photo_base64' => 'data:image/jpeg;base64,' . base64_encode('pas une image')], $yassin);
check('base64 qui n\'est pas une image : refusé', $s === 422 && isset($r['fields']['photo']), $r);

[$s, $r] = api('PATCH', "/teams/$teamId", ['description' => 'Le city du dimanche matin.', 'color_primary' => '#1E88E5', 'color_secondary' => '#ffffff', 'founded_year' => 2019, 'recruiting' => true], $yassin);
check('équipe : description, couleurs, année, recrutement', $s === 200 && $r['color_primary'] === '#1e88e5' && $r['recruiting'] === true && $r['founded_year'] === 2019, $r);
[$s, $r] = api('PATCH', "/teams/$teamId", ['color_primary' => 'bleu'], $yassin);
check('refuse une couleur mal écrite', $s === 422 && isset($r['fields']['color_primary']), $r);
[$s, $r] = upload("/teams/$teamId/logo", "$tmp/sc-logo.png", 'image/png', $karim);
check('seul le capitaine change le logo', $s === 403, $r);
[$s, $r] = upload("/teams/$teamId/logo", "$tmp/sc-logo.png", 'image/png', $yassin);
check('logo envoyé en PNG carré', $s === 200 && str_ends_with($r['logo_url'] ?? '', '.png') && getimagesize($r['logo_url'])[0] === 512, $r);

echo "Matchs\n";
$soon = (new DateTimeImmutable('+2 days', new DateTimeZone('Europe/Paris')))->setTime(18, 30)->format(DATE_ATOM);
$later = (new DateTimeImmutable('+5 days', new DateTimeZone('Europe/Paris')))->setTime(20, 0)->format(DATE_ATOM);
[$s, $m] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $soon, 'max_players' => 3, 'level' => 3, 'home_team_id' => $teamId], $yassin);
check('crée un match, l\'organisateur est inscrit', $s === 201 && $m['players_count'] === 1 && $m['my_status'] === 'registered' && $m['status'] === 'open', $m);
$matchId = $m['id'];
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => '2020-01-01T10:00:00+01:00'], $yassin);
check('refuse un match dans le passé', $s === 422, $r);
[$s, $r] = api('POST', '/matches', ['venue_id' => $v2['id'], 'format' => 'foot8', 'starts_at' => $later, 'home_team_id' => $teamId], $lea);
check('refuse une équipe dont on n\'est pas membre', $s === 422 && isset($r['fields']['home_team_id']), $r);
[$s, $m2] = api('POST', '/matches', ['venue_id' => $v2['id'], 'format' => 'foot8', 'starts_at' => $later], $lea);
check('places par défaut selon le format (8 vs 8 = 16)', $s === 201 && $m2['max_players'] === 16, $m2);
[$s, $m3] = api('POST', '/matches', ['venue_id' => $v3['id'], 'format' => 'foot11', 'starts_at' => $later], $sam);
[$s, $mp] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'futsal', 'starts_at' => $later, 'visibility' => 'private'], $sam);

[$s, $r] = api('GET', '/matches?lat=43.6&lng=1.44&radius_km=25', null, $karim);
$ids = array_column($r['items'] ?? [], 'id');
check('recherche autour de soi : Toulouse oui, Bordeaux et privé non', $s === 200 && in_array($matchId, $ids) && in_array($m2['id'], $ids) && !in_array($m3['id'], $ids) && !in_array($mp['id'], $ids), $ids);
check('la distance est renvoyée', isset($r['items'][0]['venue']['distance_km']), $r['items'][0] ?? null);
[$s, $r] = api('GET', '/matches?format=foot8', null, $karim);
check('filtre par format', $s === 200 && array_column($r['items'], 'id') === [$m2['id']], $r);
[$s, $r] = api('GET', '/matches?level=4', null, $karim);
$ids = array_column($r['items'], 'id');
check('filtre par niveau (à un cran près)', in_array($matchId, $ids) && in_array($m2['id'], $ids), $ids);
[$s, $r] = api('GET', '/matches?level=1', null, $karim);
check('niveau trop éloigné exclu', !in_array($matchId, array_column($r['items'], 'id')), $r);
[$s, $r] = api('GET', "/matches/{$mp['id']}", null, $karim);
check('un match privé reste accessible par son lien', $s === 200 && $r['visibility'] === 'private', $r);

echo "Inscriptions\n";
[$s, $r] = api('POST', "/matches/$matchId/join", ['team_id' => $teamId], $karim);
check('Karim s\'inscrit avec son équipe', $s === 200 && $r['my_status'] === 'registered' && $r['players_count'] === 2, $r);
[$s, $r] = api('POST', "/matches/$matchId/join", ['team_id' => $teamId], $lea);
check('Léa ne peut pas jouer pour une équipe qui n\'est pas la sienne', $s === 422, $r);
[$s, $r] = api('POST', "/matches/$matchId/join", null, $lea);
check('Léa prend la dernière place, le match est complet', $s === 200 && $r['my_status'] === 'registered' && $r['status'] === 'full' && $r['spots_left'] === 0, $r);
[$s, $r] = api('POST', "/matches/$matchId/join", null, $sam);
check('Sam passe en liste d\'attente', $s === 200 && $r['my_status'] === 'waitlist' && $r['waitlist_count'] === 1, $r);
[$s, $r] = api('POST', "/matches/$matchId/join", null, $sam);
check('s\'inscrire deux fois ne change rien', $s === 200 && $r['waitlist_count'] === 1 && $r['players_count'] === 3, $r);
[$s, $r] = api('GET', '/matches?spots=1', null, $sam);
check('un match complet sort du filtre « places libres »', !in_array($matchId, array_column($r['items'], 'id')), $r);
[$s, $r] = api('DELETE', "/matches/$matchId/join", null, $lea);
check('Léa se désiste', $s === 200 && $r['my_status'] === 'withdrawn', $r);
[$s, $r] = api('GET', "/matches/$matchId", null, $sam);
check('Sam récupère la place automatiquement', $r['my_status'] === 'registered' && $r['waitlist_count'] === 0 && $r['status'] === 'full', $r);
[$s, $r] = api('POST', "/matches/$matchId/join", null, $lea);
check('Léa revient : liste d\'attente', $r['my_status'] === 'waitlist', $r);
[$s, $r] = api('PATCH', "/matches/$matchId", ['max_players' => 4], $karim);
check('seul l\'organisateur modifie le match', $s === 403, $r);
[$s, $r] = api('PATCH', "/matches/$matchId", ['max_players' => 4], $yassin);
check('ajouter une place fait monter la liste d\'attente', $s === 200 && $r['players_count'] === 4 && $r['waitlist_count'] === 0 && $r['status'] === 'full', $r);
[$s, $r] = api('PATCH', "/matches/$matchId", ['max_players' => 2], $yassin);
check('retirer des places renvoie les derniers inscrits en attente', $s === 200 && $r['players_count'] === 2 && $r['waitlist_count'] === 2 && $r['my_status'] === 'registered', $r);
[$s, $r] = api('GET', '/me/matches', null, $karim);
check('mes matchs à venir', $s === 200 && in_array($matchId, array_column($r['items'], 'id')), $r);
[$s, $r] = api('POST', "/matches/$matchId/cancel", null, $karim);
check('seul l\'organisateur annule', $s === 403, $r);
[$s, $r] = api('POST', "/matches/$matchId/cancel", null, $yassin);
check('annule le match', $s === 200 && $r['status'] === 'cancelled', $r);
[$s, $r] = api('POST', "/matches/$matchId/join", null, $lea);
check('impossible de rejoindre un match annulé', $s === 409, $r);
[$s, $r] = api('GET', '/matches', null, $lea);
check('un match annulé sort de la recherche', !in_array($matchId, array_column($r['items'], 'id')), $r);

[$s, $r] = api('GET', "/users/$yassinId", null, $lea);
check('profil public : stats et équipes, sans e-mail', $s === 200 && isset($r['stats']['played'], $r['stats']['organized']) && count($r['teams']) >= 1 && !isset($r['email']) && $r['bio'] !== null, $r);
$pts = $r['stats']['played'] + 2 * $r['stats']['organized'];
check('profil public : grade calculé (1 pt par match joué, 2 par match organisé)', ($r['grade']['points'] ?? null) === $pts && $r['grade']['points'] >= $r['grade']['min'] && ($r['grade']['next_at'] === null || $pts < $r['grade']['next_at']), $r['grade'] ?? $r);
[$s, $r] = api('GET', '/me', null, $lea);
check('nouveau joueur : grade Rookie, prochain Espoir à 5 pts', ($r['grade']['key'] ?? null) === 'rookie' && $r['grade']['next_label'] === 'Espoir' && $r['grade']['next_at'] === 5, $r['grade'] ?? $r);

echo "Défis entre équipes\n";
// Yassin capitaine du Cartel, Sam crée les Lions ; les deux jouent au même city stade le même soir.
[$s, $lions] = api('POST', '/teams', ['name' => 'Les Lions', 'city' => 'Toulouse'], $sam);
$lionsId = $lions['id'];
$soir = gmdate('Y-m-d\TH:i:s\Z', strtotime('+3 days 18:00'));
$soir2 = gmdate('Y-m-d\TH:i:s\Z', strtotime('+3 days 19:00'));
[$s, $mCartel] = api('POST', '/matches', ['venue_id' => $v1["id"], 'format' => 'city5', 'starts_at' => $soir, 'home_team_id' => $teamId], $yassin);
[$s, $mLions] = api('POST', '/matches', ['venue_id' => $v1["id"], 'format' => 'city5', 'starts_at' => $soir2, 'home_team_id' => $lionsId], $sam);
[$s, $r] = api('GET', "/matches/{$mCartel['id']}/rivals", null, $yassin);
check('propose les équipes qui jouent au même terrain à la même heure', $s === 200 && ($r['items'][0]['team']['id'] ?? 0) === $lionsId, $r);
[$s, $r] = api('POST', '/challenges', ['from_team_id' => $teamId, 'to_team_id' => $lionsId, 'match_id' => $mCartel['id']], $karim);
check('seul le capitaine lance un défi', $s === 403, $r);
[$s, $r] = api('POST', '/challenges', ['from_team_id' => $teamId, 'to_team_id' => $teamId, 'match_id' => $mCartel['id']], $yassin);
check('pas de défi contre soi-même', $s === 422, $r);
[$s, $ch] = api('POST', '/challenges', ['from_team_id' => $teamId, 'to_team_id' => $lionsId, 'match_id' => $mCartel['id'], 'message' => 'Même terrain, même soir : on se fait un match ?'], $yassin);
check('le Cartel défie les Lions sur son match', $s === 201 && $ch['status'] === 'pending' && $ch['can_cancel'] === true, $ch);
[$s, $r] = api('POST', '/challenges', ['from_team_id' => $teamId, 'to_team_id' => $lionsId, 'match_id' => $mCartel['id']], $yassin);
check('pas de défi en double', $s === 409, $r);
[$s, $r] = api('GET', '/me/challenges', null, $sam);
check('les Lions voient le défi reçu', $s === 200 && ($r['received'][0]['id'] ?? 0) === $ch['id'] && $r['received'][0]['can_respond'] === true, $r);
[$s, $r] = api('POST', "/challenges/{$ch['id']}/accept", null, $yassin);
check('l\'équipe qui défie ne peut pas accepter à la place des autres', $s === 403, $r);
[$s, $r] = api('POST', "/challenges/{$ch['id']}/accept", ['message' => 'Chaud !'], $sam);
check('les Lions acceptent', $s === 200 && $r['status'] === 'accepted' && $r['match_id'] === $mCartel['id'], $r);
[$s, $r] = api('GET', "/matches/{$mCartel['id']}", null, $sam);
$samIn = array_values(array_filter($r['players'] ?? [], fn($p) => $p['id'] === $samId));
check('le match a son adversaire et le capitaine adverse est inscrit', ($r['away_team']['id'] ?? 0) === $lionsId && ($samIn[0]['team_id'] ?? 0) === $lionsId, $r);
[$s, $r] = api('POST', '/challenges', ['from_team_id' => $lionsId, 'to_team_id' => $teamId, 'match_id' => $mCartel['id']], $sam);
check('un match qui a déjà un adversaire ne peut plus être défié', $s === 409, $r);

// Nouveau créneau proposé : refus, puis acceptation qui crée le match.
$dim = gmdate('Y-m-d\TH:i:s\Z', strtotime('+6 days 10:00'));
[$s, $ch2] = api('POST', '/challenges', ['from_team_id' => $lionsId, 'to_team_id' => $teamId, 'venue_id' => $v1["id"], 'format' => 'futsal', 'starts_at' => $dim], $sam);
check('défi sur un nouveau créneau', $s === 201 && $ch2['format'] === 'futsal' && $ch2['match_id'] === null, $ch2);
[$s, $r] = api('POST', "/challenges/{$ch2['id']}/decline", ['message' => 'Pas dispo dimanche'], $yassin);
check('refus avec un mot', $s === 200 && $r['status'] === 'declined' && $r['response_message'] === 'Pas dispo dimanche', $r);
[$s, $r] = api('POST', "/challenges/{$ch2['id']}/accept", null, $yassin);
check('un défi refusé ne peut plus être accepté', $s === 409, $r);
$sam2 = gmdate('Y-m-d\TH:i:s\Z', strtotime('+7 days 10:00'));
[$s, $ch3] = api('POST', '/challenges', ['from_team_id' => $lionsId, 'to_team_id' => $teamId, 'venue_id' => $v1["id"], 'format' => 'city5', 'starts_at' => $sam2], $sam);
[$s, $r] = api('POST', "/challenges/{$ch3['id']}/accept", null, $yassin);
[$s2, $m3] = api('GET', "/matches/{$r['match_id']}", null, $yassin);
check('accepter un nouveau créneau crée le match Lions contre Cartel', $s === 200 && $m3['home_team']['id'] === $lionsId && $m3['away_team']['id'] === $teamId && $m3['players_count'] === 2, $m3);
[$s, $ch4] = api('POST', '/challenges', ['from_team_id' => $lionsId, 'to_team_id' => $teamId, 'venue_id' => $v1["id"], 'format' => 'city5', 'starts_at' => $dim], $sam);
[$s, $r] = api('POST', "/challenges/{$ch4['id']}/cancel", null, $sam);
check('le capitaine peut retirer son défi', $s === 200 && $r['status'] === 'cancelled', $r);

echo "Fil d'actualité\n";
[$s, $r] = api('GET', '/feed', null, $sam);
check('le défi relevé apparaît dans le fil', $s === 200 && ($r['items'][0]['kind'] ?? '') === 'challenge' && $r['items'][0]['match'] !== null, $r);
[$s, $r] = api('POST', '/posts', ['body' => ''], $lea);
check('refuse une publication vide', $s === 422, $r);
[$s, $r] = api('POST', '/posts', ['body' => 'Qui est chaud pour un five ce soir ?', 'team_id' => $lionsId], $lea);
check('impossible de citer une équipe dont on ne fait pas partie', $s === 422 && isset($r['fields']['team_id']), $r);
[$s, $p1] = api('POST', '/posts', ['body' => 'Victoire 7-5 hier soir, merci les gars 💪', 'team_id' => $teamId], $karim);
check('publie un texte avec son équipe', $s === 201 && $p1['team']['id'] === $teamId && $p1['is_mine'] === true, $p1);
[$s, $p2] = post_with_photo('Le terrain est refait à neuf !', "$tmp/sc-photo.jpg", $lea);
check('publie une photo (proportions gardées)', $s === 201 && $p2['image_url'] && getimagesize($p2['image_url'])[0] === 900, $p2);
[$s, $r] = api('POST', '/posts', ['body' => 'Photo depuis le téléphone', 'photo_base64' => base64_encode(file_get_contents("$tmp/sc-photo.jpg"))], $lea);
check('publie une photo envoyée en base64', $s === 201 && $r['image_url'] && $r['body'] === 'Photo depuis le téléphone', $r);
[$s, $r] = api('POST', "/posts/{$p1['id']}/like", null, $lea);
api('POST', "/posts/{$p1['id']}/like", null, $lea);
check('aime une publication (une seule fois)', $s === 200 && $r['liked'] === true && $r['likes_count'] === 1, $r);
[$s, $r] = api('DELETE', "/posts/{$p1['id']}/like", null, $lea);
check('retire son j\'aime', $r['liked'] === false && $r['likes_count'] === 0, $r);
[$s, $c1] = api('POST', "/posts/{$p1['id']}/comments", ['body' => 'Bien joué !'], $lea);
check('commente', $s === 201 && $c1['can_delete'] === true, $c1);
[$s, $r] = api('GET', "/posts/{$p1['id']}/comments", null, $karim);
check('l\'auteur voit le commentaire et peut le supprimer', count($r['items']) === 1 && $r['items'][0]['can_delete'] === true, $r);
[$s, $r] = api('GET', '/feed?scope=teams', null, $yassin);
$ids = array_column($r['items'], 'id');
check('fil « mes équipes » : coéquipiers oui, inconnus non', in_array($p1['id'], $ids) && !in_array($p2['id'], $ids), $ids);
[$s, $r] = api('GET', "/feed?author_id=$leaId", null, $yassin);
check('publications d\'un joueur', count($r['items']) === 2 && $r['items'][1]['id'] === $p2['id'] && count(array_filter($r['items'], fn($x) => $x['author']['id'] !== $leaId)) === 0, $r);
[$s] = api('DELETE', "/posts/{$p1['id']}", null, $lea);
check('impossible de supprimer la publication d\'un autre', $s === 403);
[$s] = api('POST', "/posts/{$p2['id']}/report", ['reason' => 'Spam'], $yassin);
[$s2, $r] = api('GET', '/feed', null, $yassin);
check('une publication signalée disparaît du fil de celui qui la signale', $s === 204 && !in_array($p2['id'], array_column($r['items'], 'id')), $r);
api('POST', "/posts/{$p2['id']}/report", null, $karim);
api('POST', "/posts/{$p2['id']}/report", null, $sam);
[$s, $r] = api('GET', '/feed', null, $lea);
check('masquée pour tous après 3 signalements', !in_array($p2['id'], array_column($r['items'], 'id')), $r);
[$s] = api('DELETE', "/posts/{$p1['id']}", null, $karim);
[$s2] = api('GET', "/posts/{$p1['id']}", null, $karim);
check('supprime sa publication (et ses commentaires)', $s === 204 && $s2 === 404);

echo "Modération\n";
[$s] = api('GET', '/mod/reports', null, $lea);
check('file des signalements réservée aux modérateurs', $s === 403);
$pdo->exec("UPDATE users SET site_role = 'admin' WHERE id = $yassinId");
[$s, $r] = api('GET', '/me', null, $yassin);
check('rôle admin visible sur le profil', $r['site_role'] === 'admin', $r);
[$s, $r] = api('GET', "/teams/$teamId", null, $yassin);
$roles = array_column($r['members'], 'role', 'id');
check('le rôle d\'équipe (capitaine) ne se mélange pas au rôle du site', $roles[$yassinId] === 'captain' && in_array('admin', array_column($r['members'], 'site_role')) && in_array('user', array_column($r['members'], 'site_role')), $r['members']);
[$s, $r] = api('POST', "/admin/users/$leaId/role", ['role' => 'moderator'], $yassin);
check('l\'admin nomme une modératrice', $s === 200 && $r['site_role'] === 'moderator', $r);
[$s] = api('POST', "/admin/users/$samId/role", ['role' => 'moderator'], $lea);
check('une modératrice ne peut pas nommer', $s === 403);
[$s, $r] = api('GET', '/mod/reports', null, $lea);
$rep = array_values(array_filter($r['items'] ?? [], fn($x) => $x['post']['id'] === $p2['id']))[0] ?? null;
check('la modératrice voit la publication masquée, ses 3 signalements et le motif', $s === 200 && $rep && $rep['reports'] === 3 && $rep['hidden'] === true && in_array('Spam', $rep['reasons']), $r);
[$s] = api('POST', "/mod/posts/{$p2['id']}/keep", null, $lea);
[$s2, $r] = api('GET', '/feed', null, $sam);
check('garder la publication : elle réapparaît', $s === 204 && in_array($p2['id'], array_column($r['items'], 'id')), $r);
[$s, $px] = api('POST', '/posts', ['body' => 'Message à retirer'], $sam);
[$s, $r] = api('GET', "/posts/{$px['id']}", null, $lea);
check('la modératrice peut supprimer la publication d\'un autre', $r['can_delete'] === true, $r);
[$s] = api('DELETE', "/posts/{$px['id']}", null, $lea);
check('suppression par la modératrice', $s === 204);
[$s, $r] = api('GET', '/mod/users?q=sam', null, $lea);
check('recherche de joueurs', $s === 200 && in_array($samId, array_column($r['items'], 'id')), $r);
[$s, $r] = api('POST', "/mod/users/$samId/suspend", ['days' => 3, 'reason' => 'Insultes'], $lea);
check('suspend un joueur 3 jours', $s === 200, $r);
[$s, $r] = api('POST', '/posts', ['body' => 'Je peux encore poster ?'], $sam);
check('compte suspendu : publication refusée avec la date et le motif', $s === 403 && $r['error'] === 'suspended' && str_contains($r['message'], 'Insultes'), $r);
[$s, $r] = api('GET', '/me', null, $sam);
check('compte suspendu : lecture possible, date de fin visible', $s === 200 && $r['suspended_until'] !== null, $r);
[$s] = api('POST', "/mod/users/$yassinId/suspend", ['days' => 1], $lea);
check('impossible de suspendre un admin', $s === 403);
[$s, $r] = api('DELETE', "/mod/users/$samId/suspend", null, $lea);
[$s2] = api('POST', '/posts', ['body' => 'De retour !'], $sam);
check('fin de la suspension', $s === 200 && $s2 === 201, $r);
[$s] = api('POST', "/admin/users/$yassinId/role", ['role' => 'user'], $yassin);
check('l\'admin ne peut pas se retirer son propre rôle', $s === 403);

echo "Paiement de la place\n";
$stripeBase = 'http://127.0.0.1:8097';
function mock(string $method, string $path): array
{
    global $stripeBase;
    $ch = curl_init($stripeBase . $path);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true]);
    return json_decode((string)curl_exec($ch), true) ?? [];
}
/** Envoie un événement Stripe signé au webhook. */
function webhook(string $type, array $object, ?string $secret = null): int
{
    global $base, $config;
    $payload = json_encode(['id' => 'evt_' . mt_rand(), 'type' => $type, 'data' => ['object' => $object]]);
    $t = time();
    $sig = hash_hmac('sha256', "$t.$payload", $secret ?? $config['stripe']['webhook_secret']);
    $ch = curl_init("$base/stripe/webhook");
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Stripe-Signature: t=$t,v1=$sig"]]);
    curl_exec($ch);
    return curl_getinfo($ch, CURLINFO_HTTP_CODE);
}
$lastSession = function (): array {
    $st = mock('GET', '/test/state');
    return end($st['sessions']) ?: [];
};
$back = 'exp://192.168.1.20:8081/--/match';
$in3days = gmdate('Y-m-d\TH:i:s\Z', time() + 3 * 86400);

[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'price_cents' => 500], $karim);
check('match payant sans espace pro : refusé', $s === 409 && $r['error'] === 'pro_only', $r);
[$s, $r] = api('GET', '/me/organization', null, $karim);
check('pas encore d\'espace pro', $s === 200 && $r['organization'] === null, $r);
[$s, $r] = api('POST', '/me/organization', ['name' => 'X', 'kind' => 'five', 'legal_form' => 'company'], $karim);
check('espace pro : nom trop court refusé', $s === 422 && isset($r['fields']['name']), $r);
[$s, $r] = api('POST', '/me/organization', ['name' => 'Five Toulouse Nord', 'kind' => 'five', 'legal_form' => 'company', 'city' => 'Toulouse'], $karim);
$org = $r['organization'] ?? [];
check('espace pro créé : paiements pas encore reliés, commission de 10 %', $s === 201 && $org['name'] === 'Five Toulouse Nord' && !$org['payouts']['connected']
    && $org['payouts']['enabled'] && $org['payouts']['fee_cents'] === 50 && $org['payouts']['commission_percent'] == 10 && $org['stats']['places_sold'] === 0, $r);
[$s, $r] = api('POST', '/me/organization', ['name' => 'Deuxième', 'kind' => 'club', 'legal_form' => 'company'], $karim);
check('un seul espace pro par compte', $s === 409, $r);
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'organization_id' => $org['id']], $lea);
check('publier pour l\'espace pro d\'un autre : interdit', $s === 403, $r);
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'kind' => 'tournament', 'title' => 'Tournoi', 'max_players' => 40], $lea);
check('tournoi sans espace pro : refusé', $s === 409 && $r['error'] === 'pro_only', $r);
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'max_players' => 40], $lea);
check('match de plus de 30 joueurs : refusé', $s === 422 && isset($r['fields']['max_players']), $r);
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'organization_id' => $org['id'], 'price_cents' => 500], $karim);
check('fixer un prix exige un compte Stripe prêt', $s === 409 && $r['error'] === 'payouts_not_ready', $r);
[$s, $r] = api('POST', '/me/organization/onboard', ['return_url' => "$back/pro"], $karim);
$st = mock('GET', '/test/state');
$link = end($st['requests']);
$create = array_values(array_filter($st['requests'], fn($q) => $q['path'] === '/v2/core/accounts'))[0] ?? [];
$token = array_values(array_filter($st['requests'], fn($q) => $q['path'] === '/v2/core/account_tokens'))[0] ?? [];
$tokenId = array_key_first($st['tokens'] ?? []);
check('activer les paiements : compte Accounts v2 (carte + virements, Express), e-mail et nom par jeton de compte, pays sur le compte (plateforme française) et lien Stripe', $s === 200 && str_starts_with($r['url'], 'https://connect.stripe.test/onboard/acct_')
    && $link['path'] === '/v2/core/account_links' && !isset($link['params']['use_case']['account_onboarding']['configurations'])
    && $create['params']['configuration']['merchant']['capabilities']['card_payments']['requested'] === true
    && str_contains($link['params']['use_case']['account_onboarding']['return_url'], '/pay/back?to=exp')
    && $create['params']['dashboard'] === 'express' && $create['params']['identity'] === ['country' => 'fr'] && !isset($create['params']['contact_email'])
    && $token['params'] === ['contact_email' => 'karim@example.fr', 'display_name' => 'Five Toulouse Nord']
    && $create['params']['account_token'] === $tokenId
    && $create['params']['configuration']['recipient']['capabilities']['stripe_balance']['stripe_transfers']['requested'] === true
    && $create['params']['defaults']['responsibilities'] === ['fees_collector' => 'application', 'losses_collector' => 'application']
    && str_ends_with((string)$create['version'], '.endive'), [$r, $link, $create]);
$acct = array_key_last($st['accounts']);
[$s, $r] = api('PATCH', '/me/organization', ['legal_form' => 'non_profit'], $karim);
check('forme juridique bloquée une fois le compte Stripe créé', $s === 409 && $r['error'] === 'legal_form_locked', $r);
[$sc] = user('Sans Connect', 'sansconnect@example.fr');
api('POST', '/me/organization', ['name' => 'Asso Sans Connect', 'kind' => 'association', 'legal_form' => 'non_profit'], $sc);
[$s, $r] = api('POST', '/me/organization/onboard', [], $sc);
check('Connect pas activé chez Stripe : message clair', $s === 502 && str_contains($r['message'], 'Connect'), $r);
mock('POST', "/test/accounts/$acct/ready");
[$s, $r] = api('GET', '/me/organization', null, $karim);
check('compte vérifié chez Stripe : prêt à encaisser', $s === 200 && $r['organization']['payouts']['connected'] && $r['organization']['payouts']['ready'], $r);
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'organization_id' => $org['id'], 'price_cents' => 50], $karim);
check('prix minimum 1 €', $s === 422 && isset($r['fields']['price_cents']), $r);
[$s, $pm] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in3days, 'organization_id' => $org['id'], 'price_cents' => 500, 'max_players' => 2], $karim);
check('match pro à 5 € : publié au nom du five, sans y inscrire le gérant, 4,50 € reversés par place', $s === 201 && $pm['price_cents'] === 500 && $pm['fee_cents'] === 50
    && $pm['organization']['name'] === 'Five Toulouse Nord' && $pm['my_status'] === null && $pm['spots_left'] === 2 && $pm['payout_cents'] === 450, $pm);
$pid = $pm['id'];

[$s, $r] = api('POST', "/matches/$pid/join", ['return_url' => $back], $lea);
$sess = $lastSession();
$pi = $sess['params']['payment_intent_data'] ?? [];
check('rejoindre un match payant : place réservée et page de paiement', $s === 200 && $r['my_status'] === 'pending' && $r['my_hold_until'] && $r['spots_left'] === 1
    && str_starts_with((string)$r['checkout_url'], 'https://checkout.stripe.test/'), $r);
check('Stripe : 5 € de place + 0,50 € de frais ; Supercity garde frais et commission (1 €), le reste au five',
    $sess['params']['line_items'][0]['price_data']['unit_amount'] === '500' && $sess['params']['line_items'][1]['price_data']['unit_amount'] === '50'
    && $pi['application_fee_amount'] === '100' && $pi['transfer_data']['destination'] === $acct, $sess['params'] ?? null);
check('Stripe : Managed Payments coupé pour que la commission passe', ($sess['params']['managed_payments']['enabled'] ?? null) === 'false', $sess['params']);
[$s, $r] = api('GET', "/matches/$pid", null, $lea);
check('un joueur ne voit pas ce que touche le five', $r['payout_cents'] === null, $r);
[$s, $r] = api('POST', "/matches/$pid/pay/confirm", null, $lea);
check('pas encore payé : la place reste réservée', $s === 200 && $r['my_status'] === 'pending', $r);
check('webhook mal signé refusé', webhook('checkout.session.completed', $sess, 'whsec_faux') === 400);
$paidSess = mock('POST', "/test/sessions/{$sess['id']}/pay");
check('webhook signé accepté', webhook('checkout.session.completed', $paidSess) === 200);
[$s, $r] = api('GET', "/matches/$pid", null, $lea);
check('paiement validé : inscrite', $r['my_status'] === 'registered' && $r['my_paid'] === true && $r['players_count'] === 1, $r);
webhook('checkout.session.completed', $paidSess);
api('POST', "/matches/$pid/pay/confirm", null, $lea);
$n = $pdo->query("SELECT COUNT(*) FROM payments WHERE match_id = $pid AND status = 'paid'")->fetchColumn();
check('événement reçu deux fois : un seul paiement compté', (int)$n === 1);

[$s, $r] = api('POST', "/matches/$pid/join", ['return_url' => $back], $sam);
$samSess = $lastSession();
[$s2, $r2] = api('POST', "/matches/$pid/join", ['return_url' => $back], $nina2);
check('dernière place réservée, la suivante part en liste d\'attente sans payer', $r['my_status'] === 'pending' && $r2['my_status'] === 'waitlist' && $r2['checkout_url'] === null, [$r, $r2]);
$pdo->exec("UPDATE match_participants SET hold_until = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE match_id = $pid AND user_id = $samId");
[$s, $r] = api('GET', "/matches/$pid", null, $nina2);
check('place non payée à temps : elle passe au premier de la liste d\'attente', $r['my_status'] === 'pending' && strtotime($r['my_hold_until']) > time() + 3600, $r);
$paidLate = mock('POST', "/test/sessions/{$samSess['id']}/pay");
webhook('checkout.session.completed', $paidLate);
$st = mock('GET', '/test/state');
$ref = end($st['refunds']);
[$s, $r] = api('GET', "/matches/$pid", null, $sam);
check('paiement arrivé trop tard, match complet : remboursé en entier', $r['my_status'] === 'withdrawn' && $ref['amount'] === '550' && $ref['refund_application_fee'] === 'true', [$r, $ref]);
[$s, $r] = api('POST', "/matches/$pid/pay", ['return_url' => $back], $nina2);
check('sortie de liste d\'attente : page de paiement à la demande', $s === 200 && str_starts_with($r['checkout_url'], 'https://checkout.stripe.test/'), $r);
[$s, $r] = api('POST', "/matches/$pid/pay", ['return_url' => $back], $sam);
check('rien à payer sans place réservée', $s === 409, $r);
[$s, $r] = api('PATCH', "/matches/$pid", ['price_cents' => 800], $karim);
check('prix bloqué une fois que des joueurs ont payé', $s === 409 && $r['error'] === 'price_locked', $r);

[$s, $r] = api('DELETE', "/matches/$pid/join", null, $lea);
$st = mock('GET', '/test/state');
$ref = end($st['refunds']);
$rev = end($st['reversals']);
check('désistement plus de 24 h avant : place remboursée, frais gardés', $s === 200 && $r['refunded_cents'] === 500 && $ref['amount'] === '500'
    && $ref['refund_application_fee'] === 'false' && $ref['reverse_transfer'] === 'false', [$r, $ref]);
check('le five rend ce qu\'il a reçu (4,50 €), Supercity rend sa commission', $rev['amount'] === '450' && str_starts_with($rev['transfer'], 'tr_pi'), $rev);

$in10h = gmdate('Y-m-d\TH:i:s\Z', time() + 10 * 3600);
[$s, $late] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $in10h, 'price_cents' => 400, 'organization_id' => $org['id']], $karim);
api('POST', "/matches/{$late['id']}/join", ['return_url' => $back], $lea);
webhook('checkout.session.completed', mock('POST', '/test/sessions/' . $lastSession()['id'] . '/pay'));
[$s, $r] = api('DELETE', "/matches/{$late['id']}/join", null, $lea);
check('désistement moins de 24 h avant : pas de remboursement', $s === 200 && $r['refunded_cents'] === null, $r);
[$s, $r] = api('POST', "/matches/{$late['id']}/join", ['return_url' => $back], $lea);
check('revenir après un désistement non remboursé : pas de second paiement', $r['my_status'] === 'registered' && $r['checkout_url'] === null, $r);
[$s, $r] = api('POST', "/matches/{$late['id']}/cancel", null, $karim);
$st = mock('GET', '/test/state');
$ref = end($st['refunds']);
check('match annulé : remboursé en entier, frais compris', $s === 200 && $ref['amount'] === '450' && $ref['refund_application_fee'] === 'true' && $ref['reverse_transfer'] === 'true', $ref);

echo "Espace pro\n";
[$s, $r] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'foot8', 'starts_at' => $in3days, 'organization_id' => $org['id'], 'kind' => 'tournament', 'max_players' => 64], $karim);
check('tournoi sans nom : refusé', $s === 422 && isset($r['fields']['title']), $r);
[$s, $t] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'foot8', 'starts_at' => $in3days, 'organization_id' => $org['id'], 'kind' => 'tournament',
    'title' => 'Tournoi de la Toussaint', 'max_players' => 64, 'duration_min' => 480, 'price_cents' => 1000], $karim);
check('tournoi pro : 64 joueurs, 8 h, 10 €', $s === 201 && $t['kind'] === 'tournament' && $t['title'] === 'Tournoi de la Toussaint' && $t['max_players'] === 64 && $t['duration_min'] === 480 && $t['payout_cents'] === 900, $t);
[$s, $r] = api('PATCH', "/matches/{$t['id']}", ['title' => null], $karim);
check('un tournoi garde son nom', $s === 422 && isset($r['fields']['title']), $r);
api('POST', "/matches/{$t['id']}/join", ['return_url' => $back], $lea);
$sess = $lastSession();
check('inscription au tournoi : libellé du tournoi sur la page de paiement, commission de 1 €', str_starts_with($sess['params']['line_items'][0]['price_data']['product_data']['name'], 'Inscription · Tournoi de la Toussaint')
    && $sess['params']['payment_intent_data']['application_fee_amount'] === '150', $sess['params']);
webhook('checkout.session.completed', mock('POST', "/test/sessions/{$sess['id']}/pay"));
[$s, $r] = api('GET', '/me/organization', null, $karim);
$stats = $r['organization']['stats'] ?? [];
check('chiffres du five : places vendues, commission déduite, remboursements exclus', $stats['places_sold'] === 1 && $stats['gross_cents'] === 1000
    && $stats['commission_cents'] === 100 && $stats['net_cents'] === 900 && $stats['upcoming'] === 2, $stats);
[$s, $r] = api('GET', '/matches?kind=tournament', null, $lea);
check('recherche des tournois seulement', $s === 200 && array_column($r['items'], 'id') === [$t['id']], $r);
[$s, $r] = api('GET', "/organizations/{$org['id']}", null, $lea);
check('page publique du five avec ses matchs à venir', $s === 200 && $r['name'] === 'Five Toulouse Nord' && !isset($r['payouts']) && in_array($t['id'], array_column($r['matches'], 'id')), $r);
$pdo->exec("UPDATE organizations SET commission_percent = 5 WHERE id = {$org['id']}");
[$s, $r] = api('GET', "/matches/{$t['id']}", null, $karim);
check('taux de commission négocié pour une organisation', $r['payout_cents'] === 950, $r);

echo "Scores, séries et événements bonus\n";
// Quatre matchs passés Cartel contre Lions (organisés par Sam), Yassin et Sam y ont joué avec leur équipe.
[$s, $before] = api('GET', "/users/$yassinId", null, $lea);
$past = [];
foreach ([10, 8, 6, 4] as $d) {
    $pdo->exec("INSERT INTO matches (organizer_id, venue_id, format, starts_at, duration_min, max_players, home_team_id, away_team_id, visibility)
        VALUES ($samId, {$v1['id']}, 'city5', UTC_TIMESTAMP() - INTERVAL $d DAY, 60, 10, $teamId, $lionsId, 'public')");
    $mid = (int)$pdo->lastInsertId();
    $pdo->exec("INSERT INTO match_participants (match_id, user_id, team_id, status) VALUES ($mid, $yassinId, $teamId, 'registered'), ($mid, $samId, $lionsId, 'registered')");
    $past[] = $mid;
}
[$m1, $m2, $m3, $m4] = $past;
[$s, $r] = api('POST', "/matches/{$mCartel['id']}/score", ['home_score' => 1, 'away_score' => 0], $yassin);
check('pas de score avant la fin du match', $s === 409 && $r['error'] === 'match_not_played', $r);
[$s, $r] = api('POST', "/matches/$m1/score", ['home_score' => 3, 'away_score' => 1], $lea);
check('seuls les capitaines donnent le score', $s === 403, $r);
[$s, $r] = api('POST', "/matches/$m1/score", ['home_score' => 3, 'away_score' => 1], $yassin);
check('le capitaine du Cartel annonce 3-1', $s === 200 && $r['score']['status'] === 'reported' && $r['score']['home'] === 3 && $r['score']['can_confirm'] === false && $r['score']['winner_team_id'] === null, $r['score'] ?? $r);
[$s, $r] = api('GET', "/matches/$m1", null, $sam);
check('le capitaine des Lions peut confirmer', $r['score']['can_confirm'] === true, $r['score']);
[$s, $r] = api('POST', "/matches/$m1/score/confirm", null, $yassin);
check('on ne confirme pas son propre score', $s === 409, $r);
[$s, $r] = api('POST', "/matches/$m1/score/confirm", null, $sam);
check('les Lions confirment : victoire du Cartel', $s === 200 && $r['score']['status'] === 'confirmed' && $r['score']['winner_team_id'] === $teamId, $r['score'] ?? $r);
[$s, $r] = api('POST', "/matches/$m1/score", ['home_score' => 9, 'away_score' => 1], $yassin);
check('un score validé ne se change plus', $s === 409 && $r['error'] === 'score_locked', $r);
api('POST', "/matches/$m2/score", ['home_score' => 2, 'away_score' => 0], $yassin);
[$s, $r] = api('POST', "/matches/$m2/score", ['home_score' => 2, 'away_score' => 0], $sam);
check('les deux capitaines annoncent le même score : validé', $r['score']['status'] === 'confirmed', $r['score']);
api('POST', "/matches/$m3/score", ['home_score' => 4, 'away_score' => 2], $yassin);
[$s, $r] = api('POST', "/matches/$m3/score", ['home_score' => 1, 'away_score' => 1], $sam);
check('scores différents : contesté', $r['score']['status'] === 'disputed' && $r['score']['winner_team_id'] === null, $r['score']);
[$s] = api('GET', '/mod/disputes', null, $karim);
[$s2, $r] = api('GET', '/mod/disputes', null, $yassin);
check('scores contestés : réservés à la modération', $s === 403 && array_column($r['items'], 'id') === [$m3], $r);
[$s, $r] = api('POST', "/mod/matches/$m3/score", ['home_score' => 4, 'away_score' => 2], $yassin);
check('la modération tranche', $s === 200 && $r['score']['status'] === 'confirmed' && $r['score']['winner_team_id'] === $teamId, $r['score'] ?? $r);
api('POST', "/matches/$m4/score", ['home_score' => 5, 'away_score' => 0], $yassin);
$pdo->exec("UPDATE matches SET score_at = UTC_TIMESTAMP() - INTERVAL 3 DAY WHERE id = $m4");
[$s, $r] = api('GET', "/matches/$m4", null, $lea);
check('score annoncé sans réponse depuis 48 h : validé', $r['score']['status'] === 'confirmed', $r['score']);
[$s, $r] = api('GET', "/teams/$teamId", null, $lea);
check('le Cartel est en feu : 4 victoires d\'affilée', $r['streak'] === ['current' => 4, 'best' => 4, 'on_fire' => true, 'form' => ['W', 'W', 'W', 'W']], $r['streak'] ?? $r);
[$s, $r] = api('GET', "/teams/$lionsId/results", null, $lea);
check('résultats des Lions : 4 défaites', $s === 200 && $r['streak']['current'] === 0 && $r['streak']['form'] === ['L', 'L', 'L', 'L'] && count($r['items']) === 4, $r);
[$s, $r] = api('GET', "/venues/{$v1['id']}", null, $lea);
check('roi du terrain : le Cartel', ($r['king']['team']['id'] ?? 0) === $teamId && $r['king']['streak'] === 4, $r);
[$s, $r] = api('GET', "/matches/{$mCartel['id']}", null, $lea);
check('la série s\'affiche sur le prochain match et le terrain', $r['home_team']['streak'] === 4 && $r['away_team']['streak'] === 0 && $r['venue']['king']['team']['id'] === $teamId, $r);
[$s, $r] = api('GET', "/users/$yassinId", null, $lea);
check('points de grade : +1 par match joué, +2 par victoire', $r['stats']['wins'] === 4 && $r['grade']['points'] - $before['grade']['points'] === 12, [$before['grade'], $r['grade'], $r['stats']]);
$gained = $r['grade']['points'];

$start = gmdate('Y-m-d\TH:i:s\Z', strtotime('-5 days'));
$end = gmdate('Y-m-d\TH:i:s\Z', strtotime('+8 days'));
$event = ['title' => 'Semaine en feu', 'multiplier' => 2, 'bonus_points' => 1, 'starts_at' => $start, 'ends_at' => $end];
[$s] = api('POST', '/mod/bonus-events', $event, $karim);
check('événement bonus : réservé à la modération', $s === 403);
[$s, $r] = api('POST', '/mod/bonus-events', ['multiplier' => 1, 'bonus_points' => 0] + $event, $yassin);
check('un événement qui ne rapporte rien est refusé', $s === 422 && isset($r['fields']['multiplier']), $r);
[$s, $r] = api('POST', '/mod/bonus-events', ['ends_at' => gmdate('Y-m-d\TH:i:s\Z', strtotime('+40 days'))] + $event, $yassin);
check('un événement dure un mois au plus', $s === 422, $r);
[$s, $ev] = api('POST', '/mod/bonus-events', $event, $yassin);
check('la modération crée « Semaine en feu » : points x2 et +1', $s === 201 && $ev['active'] === true && $ev['multiplier'] === 2, $ev);
[$s, $r] = api('GET', '/bonus-events', null, $lea);
check('tout le monde voit l\'événement en cours', $s === 200 && array_column($r['items'], 'id') === [$ev['id']], $r);
[$s, $r] = api('GET', "/matches/{$mCartel['id']}", null, $lea);
check('le match à venir affiche le bonus', ($r['bonus']['id'] ?? 0) === $ev['id'], $r['bonus'] ?? $r);
[$s, $r] = api('GET', "/users/$yassinId", null, $lea);
check('victoire pendant l\'événement : (1 + 2) x 2 + 1 = 7 points au lieu de 3', $r['grade']['points'] - $gained === 4, $r['grade']);
[$s] = api('DELETE', "/mod/bonus-events/{$ev['id']}", null, $yassin);
[$s2, $r] = api('GET', "/users/$yassinId", null, $lea);
check('événement supprimé : les points reviennent', $s === 204 && $r['grade']['points'] === $gained, $r['grade']);
[$s, $r] = api('DELETE', "/mod/matches/$m4/score", null, $yassin);
[$s2, $t] = api('GET', "/teams/$teamId", null, $lea);
check('la modération efface un score : la série redescend', $s === 200 && $r['score']['status'] === null && $t['streak']['current'] === 3, $t['streak'] ?? $t);

echo "Notifications\n";
$pushes = fn() => mock('GET', '/test/state')['pushes'] ?? [];
$since = fn(int $from) => array_slice($pushes(), $from);
[$s, $r] = api('POST', '/me/push-token', ['token' => 'pas-un-jeton-expo', 'platform' => 'ios'], $lea);
check('jeton de notification invalide refusé', $s === 422, $r);
// Léa et Karim habitent près du terrain, Sam à Paris.
[$s] = api('POST', '/me/push-token', ['token' => 'ExponentPushToken[lea]', 'platform' => 'ios', 'lat' => 43.59, 'lng' => 1.43], $lea);
api('POST', '/me/push-token', ['token' => 'ExponentPushToken[karimGone]', 'platform' => 'android', 'lat' => 43.6, 'lng' => 1.44], $karim);
api('POST', '/me/push-token', ['token' => 'ExponentPushToken[sam]', 'platform' => 'android', 'lat' => 48.85, 'lng' => 2.35], $sam);
[$s2, $r] = api('GET', '/me', null, $lea);
check('téléphone enregistré, alertes activées par défaut', $s === 204 && $r['notifications'] === ['events' => true, 'streaks' => true], $r['notifications'] ?? $r);
$n0 = count($pushes());
$more = [];
foreach ([3, 2] as $d) {
    $pdo->exec("INSERT INTO matches (organizer_id, venue_id, format, starts_at, duration_min, max_players, home_team_id, away_team_id, visibility)
        VALUES ($samId, {$v1['id']}, 'city5', UTC_TIMESTAMP() - INTERVAL $d DAY, 60, 10, $teamId, $lionsId, 'public')");
    $more[] = (int)$pdo->lastInsertId();
}
api('POST', "/matches/{$more[0]}/score", ['home_score' => 2, 'away_score' => 0], $yassin);
$sent = $since($n0);
check('score annoncé : le capitaine adverse est prévenu', count($sent) === 1 && $sent[0]['to'] === 'ExponentPushToken[sam]' && $sent[0]['title'] === 'Score à confirmer'
    && $sent[0]['data']['url'] === "/match/{$more[0]}", $sent);
$n1 = count($pushes());
api('POST', "/matches/{$more[0]}/score/confirm", null, $sam);
check('4 victoires d\'affilée : pas encore de palier', count($since($n1)) === 0, $since($n1));
api('POST', "/mod/matches/{$more[1]}/score", ['home_score' => 3, 'away_score' => 1], $yassin);
$sent = $since($n1);
$to = array_column($sent, 'to');
sort($to);
check('5 victoires d\'affilée : alerte aux joueurs du coin et à l\'équipe', $to === ['ExponentPushToken[karimGone]', 'ExponentPushToken[lea]']
    && str_contains($sent[0]['title'], 'Cartel Narvalo est en feu') && str_contains($sent[0]['body'], '5 victoires'), $sent);
$n2 = count($pushes());
[$s] = api('GET', '/cron/notifications?key=mauvaise', null, null);
[$s2] = api('GET', '/cron/notifications?key=cron-test', null, null);
check('tâche planifiée : clé requise, et pas de doublon', $s === 403 && $s2 === 200 && count($since($n2)) === 0, $since($n2));
$gone = $pdo->query("SELECT COUNT(*) FROM push_tokens WHERE token = 'ExponentPushToken[karimGone]'")->fetchColumn();
check('un téléphone désinstallé est oublié', (int)$gone === 0, $gone);

[$s, $r] = api('PATCH', '/me/notifications', ['events' => false], $lea);
check('Léa coupe les alertes d\'événements', $s === 200 && $r === ['events' => false, 'streaks' => true], $r);
$n3 = count($pushes());
[$s, $ev] = api('POST', '/mod/bonus-events', ['title' => 'Nuit du five', 'multiplier' => 3, 'starts_at' => gmdate('Y-m-d\TH:i:s\Z', strtotime('-1 minute')), 'ends_at' => gmdate('Y-m-d\TH:i:s\Z', strtotime('+1 day'))], $yassin);
$sent = $since($n3);
check('événement en cours : alerte à tous ceux qui l\'acceptent', $s === 201 && array_column($sent, 'to') === ['ExponentPushToken[sam]'] && $sent[0]['title'] === '⚡ Nuit du five'
    && str_starts_with($sent[0]['body'], 'Points x3 jusqu'), $sent);
$n4 = count($pushes());
[$s, $ev2] = api('POST', '/mod/bonus-events', ['title' => 'Dimanche bonus', 'multiplier' => 1, 'bonus_points' => 2, 'venue_id' => $v1['id'], 'starts_at' => gmdate('Y-m-d\TH:i:s\Z', strtotime('+2 days')), 'ends_at' => gmdate('Y-m-d\TH:i:s\Z', strtotime('+3 days'))], $yassin);
check('événement à venir : pas encore d\'alerte', $s === 201 && count($since($n4)) === 0, $since($n4));
api('PATCH', '/me/notifications', ['events' => true], $lea);
$pdo->exec("UPDATE bonus_events SET starts_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = {$ev2['id']}");
api('GET', '/bonus-events', null, $karim);
$sent = $since($n4);
check('il commence : alerte aux joueurs proches de son terrain seulement', array_column($sent, 'to') === ['ExponentPushToken[lea]'] && str_contains($sent[0]['body'], '+2 pts par match à City stade Bagatelle'), $sent);
[$s] = api('DELETE', '/me/push-token', ['token' => 'ExponentPushToken[lea]'], $lea);
$left = $pdo->query("SELECT COUNT(*) FROM push_tokens WHERE user_id = $leaId")->fetchColumn();
check('déconnexion : le téléphone ne reçoit plus rien', $s === 204 && (int)$left === 0, $left);
api('DELETE', "/mod/bonus-events/{$ev['id']}", null, $yassin);
api('DELETE', "/mod/bonus-events/{$ev2['id']}", null, $yassin);

echo "Boutique et pièces\n";
$cat = fn(array $shop, string $name) => array_values(array_filter($shop['items'], fn($i) => $i['name'] === $name))[0] ?? null;
[$s, $shop] = api('GET', '/shop', null, $karim);
$karimPoints = api('GET', "/users/$karimId", null, $karim)[1]['grade']['points'];
check('boutique : pièces = 10 par point de grade', $s === 200 && $shop['coins'] === $karimPoints * 10 && $shop['coins_per_point'] === 10, [$shop['coins'] ?? $shop, $karimPoints]);
check('catalogue en vente, saison comprise, rien d\'équipé', count($shop['items']) >= 19 && $cat($shop, 'Feuille d\'automne')['collection'] === 'Saison d\'automne'
    && $shop['equipped'] === ['frame' => null, 'banner' => null, 'title' => null], $shop['equipped']);
$pdo->exec("INSERT INTO coin_ledger (user_id, amount, reason) VALUES ($karimId, " . (1000 - $shop['coins']) . ", 'grant')");
$neon = $cat($shop, 'Néon');
[$s, $shop] = api('POST', "/shop/{$neon['id']}/buy", null, $karim);
check('achat : pièces débitées, cosmétique possédé', $s === 200 && $shop['coins'] === 700 && $cat($shop, 'Néon')['owned'] === true, $shop['coins'] ?? $shop);
[$s, $r] = api('POST', "/shop/{$neon['id']}/buy", null, $karim);
check('pas deux fois le même', $s === 409 && $r['error'] === 'already_owned', $r);
[$s, $r] = api('POST', '/shop/' . $cat($shop, 'Brasier')['id'] . '/buy', null, $karim);
[$s2, $shop] = api('POST', '/shop/' . $cat($shop, 'Pelouse')['id'] . '/buy', null, $karim);
check('pas assez de pièces : refusé, rien de débité', $s === 402 && $r['error'] === 'not_enough_coins' && $s2 === 200 && $shop['coins'] === 400, [$r, $shop['coins']]);
$crown = $cat($shop, 'Couronne');
[$s, $r] = api('POST', "/shop/{$crown['id']}/buy", null, $karim);
check('cadre Couronne réservé au grade Légende', $crown['locked'] === true && $crown['price'] === 0 && $s === 403 && $r['error'] === 'grade_required', $r);
[$s, $r] = api('PATCH', '/me/cosmetics', ['frame' => $cat($shop, 'Braise')['id']], $karim);
check('impossible d\'équiper ce qu\'on n\'a pas', $s === 422, $r);
[$s, $r] = api('PATCH', '/me/cosmetics', ['frame' => $cat($shop, 'Pelouse')['id']], $karim);
check('un cadre va dans la case cadre', $s === 422, $r);
[$s, $shop] = api('PATCH', '/me/cosmetics', ['frame' => $neon['id'], 'banner' => $cat($shop, 'Pelouse')['id']], $karim);
[$s2, $pub] = api('GET', "/users/$karimId", null, $lea);
check('équipé : visible sur le profil public', $s === 200 && $pub['cosmetics']['frame']['name'] === 'Néon' && $pub['cosmetics']['frame']['look']['effect'] === 'glow'
    && $pub['cosmetics']['banner']['look']['pattern'] === 'stripes' && $pub['cosmetics']['title'] === null, $pub['cosmetics'] ?? $pub);
[$s, $shop] = api('PATCH', '/me/cosmetics', ['banner' => null], $karim);
[$s2, $me] = api('GET', '/me', null, $karim);
check('retirer la bannière, garder le cadre ; solde sur /me', $shop['equipped']['banner'] === null && $shop['equipped']['frame']['id'] === $neon['id'] && $me['coins'] === 400, [$shop['equipped'], $me['coins'] ?? null]);

[$s, $r] = api('POST', '/mod/cosmetics', ['type' => 'frame', 'name' => 'Givre', 'rarity' => 'epic', 'price' => 300, 'look' => ['colors' => ['#e3f2fd', '#42a5f5'], 'effect' => 'spin']], $karim);
check('créer un cosmétique : réservé à la modération', $s === 403, $r);
[$s, $r] = api('POST', '/mod/cosmetics', ['type' => 'frame', 'name' => 'Givre', 'rarity' => 'epic', 'price' => 300, 'look' => ['colors' => ['bleu']]], $lea);
check('couleurs invalides refusées', $s === 422, $r);
$t = fn(string $rel) => gmdate('Y-m-d\TH:i:s\Z', strtotime($rel));
[$s, $givre] = api('POST', '/mod/cosmetics', ['type' => 'frame', 'name' => 'Givre', 'rarity' => 'epic', 'price' => 300, 'collection' => 'Saison d\'hiver',
    'look' => ['colors' => ['#E3F2FD', '#42a5f5'], 'effect' => 'spin', 'script' => 'x'], 'starts_at' => $t('-1 minute'), 'ends_at' => $t('+30 days')], $lea);
check('collection d\'hiver créée, apparence nettoyée', $s === 201 && $givre['state'] === 'on_sale' && $givre['look'] === ['colors' => ['#e3f2fd', '#42a5f5'], 'effect' => 'spin'], $givre);
[$s, $soon] = api('POST', '/mod/cosmetics', ['type' => 'title', 'name' => 'Bientôt', 'rarity' => 'rare', 'price' => 100, 'look' => ['colors' => ['#1e88e5', '#0d2c6b']], 'starts_at' => $t('+2 days'), 'ends_at' => $t('+9 days')], $lea);
[$s2, $r] = api('POST', '/mod/cosmetics', ['type' => 'title', 'name' => 'Trop long', 'rarity' => 'rare', 'price' => 100, 'look' => ['colors' => ['#1e88e5', '#0d2c6b']], 'ends_at' => $t('+200 days')], $lea);
[$s3, $shop] = api('GET', '/shop', null, $karim);
check('à venir : pas encore en boutique ; saison de 200 jours refusée', $s === 201 && $soon['state'] === 'upcoming' && $cat($shop, 'Bientôt') === null && $cat($shop, 'Givre') !== null && $s2 === 422, [$soon, $r]);
[$s, $shop] = api('POST', "/shop/{$givre['id']}/buy", null, $karim);
api('PATCH', '/me/cosmetics', ['frame' => $givre['id']], $karim);
[$s2] = api('DELETE', "/mod/cosmetics/{$givre['id']}", null, $lea);
[$s3, $r] = api('POST', "/shop/{$givre['id']}/buy", null, $lea);
[$s4, $shop] = api('GET', '/shop', null, $karim);
[$s5, $mods] = api('GET', '/mod/cosmetics', null, $lea);
$g = array_values(array_filter($mods['items'], fn($i) => $i['id'] === $givre['id']))[0];
check('retiré de la vente : ceux qui l\'ont le gardent', $s2 === 204 && $s3 === 409 && $cat($shop, 'Givre')['owned'] === true && $shop['equipped']['frame']['name'] === 'Givre'
    && $g['state'] === 'retired' && $g['owners'] === 1, [$s3, $g]);
[$s, $r] = api('POST', "/admin/users/$leaId/coins", ['amount' => 500], $lea);
[$s2, $r2] = api('POST', "/admin/users/$leaId/coins", ['amount' => 500], $yassin);
check('offrir des pièces : réservé à l\'admin', $s === 403 && $s2 === 200 && $r2['coins'] >= 500, [$r, $r2]);
[$s, $r] = api('POST', "/admin/users/$leaId/points", ['amount' => 120], $lea);
[$s2, $r2] = api('POST', "/admin/users/$leaId/points", ['amount' => 120], $yassin);
[$s3, $shop2] = api('GET', '/shop', null, $lea);
check('points de grade : réservés à l\'admin, le grade et les pièces suivent', $s === 403 && $s2 === 200 && $r2['grade']['key'] === 'legende' && $shop2['coins'] >= 1200 + 500, [$r, $r2['grade'] ?? $r2, $shop2['coins'] ?? $shop2]);
[$s, $r] = api('POST', "/admin/users/$leaId/points", ['amount' => -1000], $yassin);
check('reprendre des points : jamais sous zéro', $s === 200 && $r['grade']['key'] === 'rookie' && $r['grade']['points'] === 0, $r['grade'] ?? $r);

echo "Cartes joueurs\n";
[$s, $r] = api('GET', "/users/$samId", null, $sam);
[$s2, $r2] = api('GET', "/users/$samId", null, $lea);
check('carte : estimation par défaut, réglages visibles par soi seul', $s === 200 && $r['card']['estimated'] === true && $r['card']['votes'] === 0
    && isset($r['card']['self']['stats']['pac']) && !isset($r2['card']['self']) && $r2['card']['overall'] >= 40, $r['card'] ?? $r);
[$s, $r] = api('PATCH', '/me/card', ['stats' => ['pac' => 6, 'sho' => 5, 'pas' => 5, 'dri' => 5, 'def' => 5, 'phy' => 5]], $sam);
check('estimation : 1 à 5 étoiles par stat', $s === 422 && isset($r['fields']['stats']), $r);
[$s, $card] = api('PATCH', '/me/card', ['stats' => ['pac' => 5, 'sho' => 5, 'pas' => 5, 'dri' => 5, 'def' => 5, 'phy' => 5], 'weak_foot' => 4, 'skill_moves' => 3], $sam);
check('estimation enregistrée : 5 étoiles = 99', $s === 200 && $card['overall'] === 99 && $card['stats']['pac'] === 99 && $card['weak_foot'] === 4 && $card['self']['set'] === true, $card);
[$s] = api('GET', "/matches/$m1/ratings", null, $yassin);
[$s2] = api('GET', "/matches/$m4/ratings", null, $lea);
[$s3, $r] = api('GET', "/matches/$m4/ratings", null, $yassin);
check('notes : 7 jours après la fin, joueurs du match seulement', $s === 403 && $s2 === 403 && $s3 === 200 && array_column($r['players'], 'id') === [$samId] && $r['players'][0]['stars'] === null, [$s, $s2, $r]);
[$s, $m] = api('GET', "/matches/$m4", null, $yassin);
[$s2, $mFut] = api('GET', "/matches/{$mCartel['id']}", null, $yassin);
check('match fini : il reste un joueur à noter', $m['ratings_left'] === 1 && $mFut['ratings_left'] === null, [$m['ratings_left'] ?? null, $mFut['ratings_left'] ?? null]);
[$s, $r] = api('POST', "/matches/$m4/ratings", ['ratings' => [['user_id' => $yassinId, 'stars' => 5]]], $yassin);
check('on ne se note pas soi-même', $s === 422, $r);
[$s, $r] = api('POST', "/matches/$m4/ratings", ['ratings' => [['user_id' => $samId, 'stars' => 1, 'best' => 'sho']]], $yassin);
[$s2, $m] = api('GET', "/matches/$m4", null, $yassin);
[$s3, $pub] = api('GET', "/users/$samId", null, $lea);
check('vote : pèse comme un tiers de l\'estimation, le point fort compte une étoile de plus', $s === 200 && $r['players'][0]['stars'] === 1 && $m['ratings_left'] === 0
    && $pub['card']['votes'] === 1 && $pub['card']['stats']['pac'] === 84 && $pub['card']['stats']['sho'] === 88 && $pub['card']['estimated'] === true, $pub['card'] ?? $r);
api('POST', "/matches/$m4/ratings", ['ratings' => [['user_id' => $samId, 'stars' => 5]]], $yassin);
[$s, $pub] = api('GET', "/users/$samId", null, $lea);
check('on peut changer sa note : un seul vote compté', $pub['card']['votes'] === 1 && $pub['card']['stats']['sho'] === 99, $pub['card']);

echo "RGPD\n";
[$zoe, $zoeId] = user('Zoé', 'zoe@example.fr');
api('POST', '/posts', ['body' => 'Qui joue jeudi ?'], $zoe);
[$s, $r] = api('POST', '/me/export', null, $zoe);
$mails = array_map(fn($l) => json_decode($l, true), file($config['mail_log']));
$last = end($mails);
$data = json_decode($last['attachment']['content'] ?? 'null', true);
check('copie des données : envoyée en pièce jointe à l\'adresse du compte', $s === 202 && $last['to'] === 'zoe@example.fr'
    && $data['account']['email'] === 'zoe@example.fr' && $data['posts'][0]['body'] === 'Qui joue jeudi ?', [$r, $last['attachment']['name'] ?? null]);
[$s, $m] = api('POST', '/matches', ['venue_id' => $v1['id'], 'format' => 'city5', 'starts_at' => $later], $zoe);
[$s2, $r] = api('DELETE', '/me', ['password' => 'mauvais'], $zoe);
[$s3, $r3] = api('DELETE', '/me', ['password' => PASS], $zoe);
check('suppression : mot de passe exigé, bloquée par un match à venir', $s === 201 && $s2 === 422 && $s3 === 409 && $r3['error'] === 'deletion_blocked', [$r, $r3]);
api('POST', "/matches/{$m['id']}/cancel", null, $zoe);
[$s, $r] = api('DELETE', '/me', ['password' => PASS], $zoe);
[$s2] = api('GET', '/me', null, $zoe);
[$s3] = api('POST', '/auth/login', ['email' => 'zoe@example.fr', 'password' => PASS]);
[$s4, $pub] = api('GET', "/users/$zoeId", null, $lea);
[$s5, $feed] = api('GET', "/feed?author_id=$zoeId", null, $lea);
$row = $pdo->query("SELECT email, birth_date, deleted_at FROM users WHERE id = $zoeId")->fetch(PDO::FETCH_ASSOC);
check('compte supprimé : plus de connexion, plus de nom, plus de publications', $s === 204 && $s2 === 401 && $s3 === 401
    && $pub['display_name'] === 'Joueur supprimé' && ($feed['items'] ?? null) === [] && !str_contains($row['email'], 'zoe') && $row['birth_date'] === null && $row['deleted_at'] !== null, [$r, $pub['display_name'] ?? $pub, $row]);
[$s, $r] = api('POST', '/auth/register', ['email' => 'zoe@example.fr', 'password' => PASS, 'display_name' => 'Zoé', 'birth_date' => '1998-05-12', 'accept_terms' => true]);
check('l\'adresse est libérée : on peut se réinscrire', $s === 201, $r);

echo "Divers\n";
[$s, $r] = api('GET', '/matches/999999', null, $lea);
check('match introuvable : 404', $s === 404, $r);
[$s, $r] = api('PUT', '/me', null, $lea);
check('méthode non prévue : 405', $s === 405, $r);
[$s, $r] = api('GET', '/teams', null, 'jeton-bidon-0123456789abcdef');
check('jeton inconnu : 401', $s === 401, $r);

echo "\n$passed réussis, $failed échoués\n";
exit($failed ? 1 : 0);
