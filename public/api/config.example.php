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
    // Envoi par la boîte mail Hostinger (recommandé : sinon les e-mails finissent souvent en spam ou se perdent).
    // Mot de passe : celui de la boîte contact@supercity.fr, défini dans hPanel > E-mails.
    'smtp' => [
        'host' => 'smtp.hostinger.com',
        'port' => 465,
        'secure' => 'ssl',
        'user' => 'contact@supercity.fr',
        'password' => 'mot_de_passe_de_la_boite',
    ],
    // Paiement de la place (Stripe Connect). Laisser vide tant que le compte Stripe n'est pas prêt :
    // les matchs restent alors gratuits. Clés dans dashboard.stripe.com > Développeurs > Clés API.
    'stripe' => [
        'secret_key' => '',            // sk_live_... (ou sk_test_... pour essayer sans vrai argent)
        'webhook_secret' => '',        // whsec_... affiché à la création du webhook
        'fee_cents' => 50,             // frais de service Supercity par place, en centimes
    ],
];
