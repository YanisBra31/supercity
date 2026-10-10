<?php
// Inscription à la liste d'attente : reçoit {"email": "...", "consent": true} en POST et l'enregistre dans MySQL.
header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'method_not_allowed']);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
$email = strtolower(trim((string)($input['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    respond(422, ['error' => 'invalid_email']);
}
// Consentement RGPD : la case du formulaire doit être cochée.
if (($input['consent'] ?? false) !== true) {
    respond(422, ['error' => 'consent_required']);
}

// Identifiants MySQL hors du dossier public : supercity-config.php à côté de public_html
// (voir config.example.php). Jamais dans Git.
$configFile = dirname(__DIR__, 2) . '/supercity-config.php';
if (!is_file($configFile)) {
    respond(500, ['error' => 'not_configured']);
}
$config = require $configFile;

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['dbname']),
        $config['user'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    // INSERT IGNORE : une adresse déjà inscrite est traitée comme un succès.
    $stmt = $pdo->prepare('INSERT IGNORE INTO waitlist (email) VALUES (:email)');
    $stmt->execute(['email' => $email]);
} catch (PDOException $e) {
    error_log('waitlist: ' . $e->getMessage());
    respond(500, ['error' => 'database']);
}

respond(201, ['ok' => true]);
