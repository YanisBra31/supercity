<?php
// Socle commun de l'API : configuration, base de données, requêtes, réponses et validation.
declare(strict_types=1);

final class HttpError extends Exception
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $fields = []
    ) {
        parent::__construct($message);
    }
}

function config(): array
{
    static $config = null;
    if ($config === null) {
        // Sur Hostinger : supercity-config.php dans le dossier qui contient public_html.
        $file = getenv('SUPERCITY_CONFIG') ?: dirname(__DIR__, 3) . '/supercity-config.php';
        if (!is_file($file)) {
            throw new HttpError(500, 'not_configured', "L'API n'est pas configurée.");
        }
        $config = require $file;
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config();
        $pdo = new PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['host'], $c['dbname']),
            $c['user'],
            $c['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

function query(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function one(string $sql, array $params = []): ?array
{
    $row = query($sql, $params)->fetch();
    return $row === false ? null : $row;
}

function transaction(callable $fn): mixed
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $fn();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ───── Requête ─────

function body(): array
{
    static $body = null;
    if ($body === null) {
        $raw = file_get_contents('php://input') ?: '';
        $body = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($body)) {
            throw new HttpError(400, 'invalid_json', 'Le corps de la requête doit être un objet JSON.');
        }
    }
    return $body;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strcasecmp($k, 'Authorization') === 0) {
                $header = $v;
            }
        }
    }
    return preg_match('/^Bearer\s+([A-Za-z0-9_-]{20,})$/', trim($header), $m) ? $m[1] : null;
}

// ───── Réponse ─────

function respond(int $status, mixed $data = null): never
{
    http_response_code($status);
    if ($status !== 204) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

function iso(?string $mysqlDate): ?string
{
    return $mysqlDate === null ? null : str_replace(' ', 'T', $mysqlDate) . 'Z';
}

// ───── Validation ─────
// Chaque fonction lit un champ de $data, renvoie la valeur nettoyée ou ajoute une erreur dans $errors.

final class Validator
{
    public array $errors = [];
    public array $out = [];

    public function __construct(private array $data, private bool $partial = false)
    {
    }

    private function has(string $key): bool
    {
        return array_key_exists($key, $this->data);
    }

    private function skip(string $key, bool $required): bool
    {
        if ($this->has($key) && $this->data[$key] !== null && $this->data[$key] !== '') {
            return false;
        }
        if ($required && (!$this->partial || $this->has($key))) {
            $this->errors[$key] = 'Champ obligatoire.';
        } elseif ($this->has($key)) {
            $this->out[$key] = null;
        }
        return true;
    }

    public function string(string $key, int $min, int $max, bool $required = true): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = $this->data[$key];
        if (!is_string($v)) {
            $this->errors[$key] = 'Doit être un texte.';
            return $this;
        }
        $v = trim($v);
        $len = mb_strlen($v);
        if ($len < $min || $len > $max) {
            $this->errors[$key] = "Entre $min et $max caractères.";
            return $this;
        }
        $this->out[$key] = $v;
        return $this;
    }

    public function email(string $key): self
    {
        if ($this->skip($key, true)) {
            return $this;
        }
        $v = strtolower(trim((string)$this->data[$key]));
        if (!filter_var($v, FILTER_VALIDATE_EMAIL) || strlen($v) > 254) {
            $this->errors[$key] = 'Adresse e-mail invalide.';
            return $this;
        }
        $this->out[$key] = $v;
        return $this;
    }

    public function int(string $key, int $min, int $max, bool $required = true): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = $this->data[$key];
        if (!is_int($v) && !(is_string($v) && preg_match('/^-?\d+$/', $v))) {
            $this->errors[$key] = 'Doit être un nombre entier.';
            return $this;
        }
        $v = (int)$v;
        if ($v < $min || $v > $max) {
            $this->errors[$key] = "Entre $min et $max.";
            return $this;
        }
        $this->out[$key] = $v;
        return $this;
    }

    public function float(string $key, float $min, float $max, bool $required = true): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = $this->data[$key];
        if (!is_numeric($v)) {
            $this->errors[$key] = 'Doit être un nombre.';
            return $this;
        }
        $v = (float)$v;
        if ($v < $min || $v > $max) {
            $this->errors[$key] = "Entre $min et $max.";
            return $this;
        }
        $this->out[$key] = $v;
        return $this;
    }

    public function bool(string $key, bool $required = true): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = $this->data[$key];
        if (!is_bool($v)) {
            $this->errors[$key] = 'Doit être true ou false.';
            return $this;
        }
        $this->out[$key] = $v ? 1 : 0;
        return $this;
    }

    public function enum(string $key, array $allowed, bool $required = true): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = $this->data[$key];
        if (!in_array($v, $allowed, true)) {
            $this->errors[$key] = 'Valeur possible : ' . implode(', ', $allowed) . '.';
            return $this;
        }
        $this->out[$key] = $v;
        return $this;
    }

    public function url(string $key, bool $required = false): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = trim((string)$this->data[$key]);
        if (!preg_match('#^https://#i', $v) || !filter_var($v, FILTER_VALIDATE_URL) || strlen($v) > 500) {
            $this->errors[$key] = 'Doit être une adresse https valide.';
            return $this;
        }
        $this->out[$key] = $v;
        return $this;
    }

    /** Date ISO 8601 (avec fuseau), convertie en UTC pour MySQL. */
    public function datetime(string $key, bool $required = true): self
    {
        if ($this->skip($key, $required)) {
            return $this;
        }
        $v = $this->data[$key];
        $d = is_string($v) ? date_create_immutable($v) : false;
        if (!$d || !preg_match('/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', $v)) {
            $this->errors[$key] = 'Date ISO 8601 attendue, par exemple 2026-11-14T18:30:00+01:00.';
            return $this;
        }
        $this->out[$key] = $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        return $this;
    }

    public function check(): array
    {
        if ($this->errors) {
            throw new HttpError(422, 'validation_failed', 'Certains champs sont invalides.', $this->errors);
        }
        return $this->out;
    }
}

function validate(array $data, bool $partial = false): Validator
{
    return new Validator($data, $partial);
}

/** Pagination commune : ?limit=20&offset=0 (limit plafonné à 50). */
function paging(): array
{
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 20)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    return [$limit, $offset];
}

function not_found(string $what = 'Ressource'): never
{
    throw new HttpError(404, 'not_found', "$what introuvable.");
}

function forbidden(string $message = "Tu n'as pas le droit de faire ça."): never
{
    throw new HttpError(403, 'forbidden', $message);
}
