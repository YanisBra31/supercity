<?php
// Tests de bout en bout de l'API, sur une base de test VIDÉE à chaque lancement.
// Usage : SUPERCITY_CONFIG=chemin/config-test.php php tests/api_test.php http://127.0.0.1:8093/api/v1
declare(strict_types=1);

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8093/api/v1', '/');
$config = require getenv('SUPERCITY_CONFIG');
$pdo = new PDO("mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4", $config['user'], $config['password']);
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach (['email_codes', 'auth_attempts', 'match_participants', 'matches', 'venues', 'team_members', 'teams', 'auth_tokens', 'users'] as $t) {
    $pdo->exec("TRUNCATE $t");
}
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

echo "Divers\n";
[$s, $r] = api('GET', '/matches/999999', null, $lea);
check('match introuvable : 404', $s === 404, $r);
[$s, $r] = api('PUT', '/me', null, $lea);
check('méthode non prévue : 405', $s === 405, $r);
[$s, $r] = api('GET', '/teams', null, 'jeton-bidon-0123456789abcdef');
check('jeton inconnu : 401', $s === 401, $r);

echo "\n$passed réussis, $failed échoués\n";
exit($failed ? 1 : 0);
