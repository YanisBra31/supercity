<?php
// Routeur de test pour le serveur PHP intégré (imite les .htaccess).
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/v1(/|$)#', $path)) { require __DIR__ . "/../public/api/index.php"; return true; }
if (preg_match('#^/m/(\d+)(\.jpg|/?)$#', $path, $x)) {
    $_GET['match'] = $x[1];
    if ($x[2] === '.jpg') $_GET['img'] = '1';
    require __DIR__ . '/../public/foot/index.php';
    return true;
}
if (preg_match('#^/foot/(?:([a-z0-9-]+)/?)?$#', $path, $x)) {
    if (!empty($x[1])) $_GET['ville'] = $x[1];
    require __DIR__ . '/../public/foot/index.php';
    return true;
}
return false;
