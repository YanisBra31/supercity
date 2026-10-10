<?php
// Sécurité des comptes : règles de mot de passe, limitation des essais, codes envoyés par e-mail.
declare(strict_types=1);

const MIN_AGE = 15;          // majorité numérique en France
const PASSWORD_MIN = 10;
const CODE_MINUTES = 30;
const CODE_MAX_TRIES = 5;

// Mots de passe trop courants (on compare la partie lettres, sans chiffres ni symboles autour).
const COMMON_PASSWORDS = [
    'motdepasse', 'password', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop', 'soleil', 'bonjour', 'football',
    'foot', 'supercity', 'marseille', 'paris', 'psg', 'om', 'olympique', 'doudou', 'loulou', 'chouchou',
    'nicolas', 'julien', 'camille', 'coucou', 'iloveyou', 'jetaime', 'admin', 'welcome', 'abcdef', 'abc',
    'monkey', 'dragon', 'master', 'sunshine', 'princess', 'letmein', 'toulouse', 'lyon', 'zidane', 'messi', 'ronaldo',
];

/** Limites réglables dans la config (clé `limits`), utile pour les tests. */
function limit(string $key): int
{
    $defaults = [
        'login_per_email' => 5,      // échecs par compte sur 15 min
        'login_per_ip' => 30,        // échecs par adresse IP sur 15 min
        'register_per_ip' => 5,      // inscriptions par IP sur 1 h
        'mail_per_email' => 3,       // e-mails envoyés par compte sur 1 h
    ];
    return (int)(config()['limits'][$key] ?? $defaults[$key]);
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function record_attempt(string $kind, ?string $email, bool $success): void
{
    query('INSERT INTO auth_attempts (kind, ip, email, success) VALUES (?, ?, ?, ?)', [$kind, client_ip(), $email, $success ? 1 : 0]);
    // Ménage léger : on oublie les tentatives de plus de 2 jours.
    if (random_int(1, 50) === 1) {
        query('DELETE FROM auth_attempts WHERE created_at < UTC_TIMESTAMP() - INTERVAL 2 DAY');
    }
}

function count_attempts(string $kind, string $by, string $value, int $minutes, bool $failuresOnly = true): int
{
    $col = $by === 'ip' ? 'ip' : 'email';
    $row = one(
        "SELECT COUNT(*) AS n FROM auth_attempts WHERE kind = ? AND $col = ? AND created_at > UTC_TIMESTAMP() - INTERVAL $minutes MINUTE"
        . ($failuresOnly ? ' AND success = 0' : ''),
        [$kind, $value]
    );
    return (int)$row['n'];
}

function too_many(string $message): never
{
    throw new HttpError(429, 'too_many_attempts', $message);
}

/** Erreurs de mot de passe, en français ; tableau vide si le mot de passe est accepté. */
function password_problems(string $password, array $personal = []): array
{
    $problems = [];
    if (mb_strlen($password) < PASSWORD_MIN) {
        $problems[] = 'au moins ' . PASSWORD_MIN . ' caractères';
    }
    if (mb_strlen($password) > 200) {
        $problems[] = '200 caractères au plus';
    }
    if (!preg_match('/\pL/u', $password)) {
        $problems[] = 'au moins une lettre';
    }
    if (!preg_match('/\d/', $password)) {
        $problems[] = 'au moins un chiffre';
    }
    $lower = mb_strtolower($password);
    $core = preg_replace('/[^\pL]/u', '', $lower);
    if (in_array($core, COMMON_PASSWORDS, true) || preg_match('/^(.)\1+$/u', $lower)) {
        $problems[] = 'pas un mot de passe trop courant';
    }
    foreach ($personal as $word) {
        $word = mb_strtolower(trim((string)$word));
        if (mb_strlen($word) >= 3 && str_contains($lower, $word)) {
            $problems[] = 'sans ton pseudo ni ton e-mail';
            break;
        }
    }
    return $problems;
}

function password_error(string $password, array $personal = []): ?string
{
    $p = password_problems($password, $personal);
    return $p ? 'Il faut ' . implode(', ', $p) . '.' : null;
}

/** Âge en années révolues à partir d'une date AAAA-MM-JJ. */
function age_from(string $date): int
{
    return (new DateTimeImmutable($date))->diff(new DateTimeImmutable('today'))->y;
}

function send_mail(string $to, string $subject, string $text): void
{
    $c = config();
    if (!empty($c['mail_log'])) {
        // Environnement de test : on écrit l'e-mail dans un fichier au lieu de l'envoyer.
        file_put_contents($c['mail_log'], json_encode(['to' => $to, 'subject' => $subject, 'text' => $text]) . "\n", FILE_APPEND);
        return;
    }
    $from = $c['mail_from'] ?? 'Supercity <contact@supercity.fr>';
    $address = preg_match('/<([^>]+)>/', $from, $m) ? $m[1] : $from;
    $encoded = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        "From: $from",
        "Reply-To: $address",
        'Date: ' . date(DATE_RFC2822),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($address, '@'), 1) . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    $body = chunk_split(base64_encode($text));
    if (!empty($c['smtp']['host'])) {
        try {
            smtp_send($c['smtp'], $address, $to, array_merge(["To: $to", "Subject: $encoded"], $headers), $body);
        } catch (Throwable $e) {
            error_log('Supercity SMTP : ' . $e->getMessage());
        }
        return;
    }
    // Sans SMTP : mail() de PHP, avec l'expéditeur aussi en enveloppe (-f) pour ne pas finir en spam.
    if (!@mail($to, $encoded, $body, implode("\r\n", $headers), '-f' . $address)) {
        error_log("Supercity : mail() n'a pas pu envoyer à $to");
    }
}

/** Envoi par SMTP authentifié (ex. Hostinger : smtp.hostinger.com, port 465, ssl). */
function smtp_send(array $s, string $from, string $to, array $headers, string $body): void
{
    $secure = $s['secure'] ?? 'ssl';
    $port = (int)($s['port'] ?? ($secure === 'ssl' ? 465 : 587));
    $sock = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . $s['host'] . ':' . $port, $errno, $errstr, 15);
    if (!$sock) {
        throw new RuntimeException("connexion impossible : $errstr");
    }
    stream_set_timeout($sock, 15);
    $read = function (int $expect) use ($sock): void {
        $line = '';
        do {
            $l = fgets($sock, 1024);
            if ($l === false) {
                throw new RuntimeException('connexion coupée');
            }
            $line .= $l;
        } while (isset($l[3]) && $l[3] === '-');
        if ((int)substr($l, 0, 3) !== $expect) {
            throw new RuntimeException('réponse inattendue : ' . trim($line));
        }
    };
    $cmd = function (string $c, int $expect) use ($sock, $read): void {
        fwrite($sock, $c . "\r\n");
        $read($expect);
    };
    $host = gethostname() ?: 'localhost';
    $read(220);
    $cmd("EHLO $host", 250);
    if ($secure === 'tls') {
        $cmd('STARTTLS', 220);
        if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('STARTTLS impossible');
        }
        $cmd("EHLO $host", 250);
    }
    if (!empty($s['user'])) {
        $cmd('AUTH LOGIN', 334);
        $cmd(base64_encode($s['user']), 334);
        $cmd(base64_encode((string)($s['password'] ?? '')), 235);
    }
    $cmd("MAIL FROM:<$from>", 250);
    $cmd("RCPT TO:<$to>", 250);
    $cmd('DATA', 354);
    // Une ligne qui commence par un point est doublée (règle SMTP).
    $data = implode("\r\n", $headers) . "\r\n\r\n" . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", rtrim($body)));
    $cmd($data . "\r\n.", 250);
    fwrite($sock, "QUIT\r\n");
    fclose($sock);
}

/** Crée un code à 6 chiffres (remplace le précédent) et l'envoie par e-mail. */
function send_code(array $user, string $purpose): void
{
    if (count_attempts('mail', 'email', $user['email'], 60, false) >= limit('mail_per_email')) {
        too_many("Trop d'e-mails envoyés. Réessaie dans une heure.");
    }
    record_attempt('mail', $user['email'], true);
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    query('DELETE FROM email_codes WHERE user_id = ? AND purpose = ?', [$user['id'], $purpose]);
    query(
        'INSERT INTO email_codes (user_id, purpose, code_hash, expires_at) VALUES (?, ?, ?, UTC_TIMESTAMP() + INTERVAL ' . CODE_MINUTES . ' MINUTE)',
        [$user['id'], $purpose, hash('sha256', $code)]
    );
    $name = $user['display_name'];
    if ($purpose === 'verify') {
        send_mail($user['email'], "Ton code Supercity : $code", "Salut $name,\n\nBienvenue sur Supercity ! Pour confirmer ton adresse e-mail, entre ce code dans l'appli :\n\n    $code\n\nIl est valable " . CODE_MINUTES . " minutes. Si tu n'as pas créé de compte, ignore ce message.\n\nÀ bientôt sur le terrain,\nSupercity");
    } else {
        send_mail($user['email'], "Réinitialisation de ton mot de passe : $code", "Salut $name,\n\nTu as demandé à changer ton mot de passe Supercity. Entre ce code dans l'appli :\n\n    $code\n\nIl est valable " . CODE_MINUTES . " minutes. Si ce n'est pas toi, ignore ce message : ton mot de passe reste le même.\n\nSupercity");
    }
}

/** Vérifie un code ; le consomme s'il est bon, compte l'essai sinon. */
function consume_code(int $userId, string $purpose, string $code): bool
{
    $row = one(
        'SELECT * FROM email_codes WHERE user_id = ? AND purpose = ? AND expires_at > UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1',
        [$userId, $purpose]
    );
    if (!$row || (int)$row['attempts'] >= CODE_MAX_TRIES) {
        return false;
    }
    if (!hash_equals($row['code_hash'], hash('sha256', $code))) {
        query('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?', [$row['id']]);
        return false;
    }
    query('DELETE FROM email_codes WHERE id = ?', [$row['id']]);
    return true;
}
