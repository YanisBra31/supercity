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
    // Expéditeur des e-mails (codes de vérification, mot de passe oublié). L'adresse doit être
    // sur le domaine supercity.fr ; la créer dans hPanel > E-mails si besoin.
    'mail_from' => 'Supercity <contact@supercity.fr>',
];
