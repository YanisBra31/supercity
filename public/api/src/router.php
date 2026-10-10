<?php
// Routeur minimal : méthode + motif de chemin (regex) -> fonction.
declare(strict_types=1);

final class Router
{
    private array $routes = [];

    public function get(string $p, callable $h): void { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void { $this->add('POST', $p, $h); }
    public function patch(string $p, callable $h): void { $this->add('PATCH', $p, $h); }
    public function delete(string $p, callable $h): void { $this->add('DELETE', $p, $h); }

    private function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [$method, '#^' . $pattern . '$#', $handler];
    }

    public function dispatch(string $method, string $path): void
    {
        $allowed = [];
        foreach ($this->routes as [$m, $regex, $handler]) {
            if (preg_match($regex, $path, $params)) {
                if ($m === $method) {
                    $handler(...array_slice($params, 1));
                    return;
                }
                $allowed[] = $m;
            }
        }
        if ($allowed) {
            header('Allow: ' . implode(', ', array_unique($allowed)));
            throw new HttpError(405, 'method_not_allowed', 'Méthode non autorisée sur cette adresse.');
        }
        throw new HttpError(404, 'not_found', 'Adresse inconnue.');
    }
}
