<?php
// Routeur de test pour le serveur PHP intégré (imite le .htaccess).
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/v1(/|$)#', $path)) { require __DIR__ . "/../public/api/index.php"; return true; }
return false;
