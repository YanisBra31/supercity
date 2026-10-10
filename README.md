# Supercity

Site vitrine de [supercity.fr](https://supercity.fr), l'appli de foot amateur : créer son équipe, organiser des matchs city, futsal, 8 vs 8 ou 11 vs 11, partout et sur tous les terrains.

## Stack

- Next.js en export statique : le build produit des fichiers HTML/CSS/JS à déposer sur l'hébergement.
- PHP 8 + MySQL (Hostinger, phpMyAdmin), sans dépendance :
  - `public/api/waitlist.php` : liste d'attente du site.
  - `public/api/index.php` et `public/api/src/` : l'API de l'appli (comptes, équipes, terrains, matchs), documentée dans [docs/API.md](docs/API.md).
- Scripts SQL dans `sql/`, à importer dans l'ordre.

## Lancer en local

```bash
npm install
npm run dev
```

En local, le formulaire affiche une erreur : le script PHP ne tourne que sur l'hébergement.

## Mise en ligne

1. Dans phpMyAdmin, importer dans l'ordre `sql/001_waitlist.sql`, `sql/002_core.sql`, `sql/003_securite.sql` puis `sql/004_personnalisation.sql`. Les photos envoyées vont dans `public_html/uploads/` (créé automatiquement).
2. Copier `public/api/config.example.php` en `supercity-config.php` dans le dossier qui contient `public_html` (pas dedans), et le remplir avec les identifiants MySQL.
3. `npm run build`, puis déposer le contenu du dossier `out/` dans `public_html` (il remplace la page de maintenance).

## Tester l'API

Les tests de bout en bout tournent contre une base MySQL de test, **vidée à chaque lancement** (jamais la base de production) :

```bash
# config-test.php : même format que config.example.php, pointant vers une base de test
SUPERCITY_CONFIG=config-test.php php -S 127.0.0.1:8093 -t public tests/router.php &
SUPERCITY_CONFIG=config-test.php php tests/api_test.php http://127.0.0.1:8093/api/v1
```
