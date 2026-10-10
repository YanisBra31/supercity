# Supercity

Site vitrine de [supercity.fr](https://supercity.fr), l'appli de foot amateur : créer son équipe, organiser des matchs city, futsal, 8 vs 8 ou 11 vs 11, partout et sur tous les terrains.

## Stack

- Next.js en export statique : le build produit des fichiers HTML/CSS/JS à déposer sur l'hébergement.
- PHP + MySQL (Hostinger, phpMyAdmin) pour la liste d'attente : `public/api/waitlist.php`.

## Lancer en local

```bash
npm install
npm run dev
```

En local, le formulaire affiche une erreur : le script PHP ne tourne que sur l'hébergement.

## Mise en ligne

1. Dans phpMyAdmin, importer `sql/001_waitlist.sql`.
2. Copier `public/api/config.example.php` en `supercity-config.php` dans le dossier qui contient `public_html` (pas dedans), et le remplir avec les identifiants MySQL.
3. `npm run build`, puis déposer le contenu du dossier `out/` dans `public_html` (il remplace la page de maintenance).
