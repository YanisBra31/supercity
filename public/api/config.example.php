<?php
// Copier en supercity-config.php dans le dossier qui contient public_html (pas dedans),
// puis remplir avec les identifiants MySQL créés dans hPanel > Bases de données.
return [
    'host' => 'localhost',
    'dbname' => 'nom_de_la_base',
    'user' => 'utilisateur',
    'password' => 'mot_de_passe',
    // Sites web d'une autre adresse autorisés à appeler l'API (laisser vide pour supercity.fr seul).
    'cors_origins' => [],
];
