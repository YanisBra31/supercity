# API Supercity v1

Adresse de base : `https://supercity.fr/api/v1`. Corps et réponses en JSON, dates en ISO 8601 (renvoyées en UTC, suffixe `Z`).

Toutes les routes sauf `/health`, `/auth/register` et `/auth/login` demandent l'en-tête `Authorization: Bearer <jeton>`. Le jeton est valable 60 jours.

En cas d'erreur, la réponse ressemble à `{"error": "validation_failed", "message": "...", "fields": {"email": "Adresse e-mail invalide."}}`.

| Code | Sens |
| --- | --- |
| 401 `unauthenticated` / `invalid_credentials` | Pas connecté, ou mauvais identifiants |
| 403 `forbidden` | Action réservée au capitaine ou à l'organisateur |
| 404 `not_found` | Ressource ou adresse inconnue |
| 409 | Conflit : e-mail déjà pris, match annulé ou joué, capitaine qui part sans passer le brassard |
| 422 `validation_failed` | Champs invalides, détaillés dans `fields` |

Les listes acceptent `?limit=` (20 par défaut, 50 au plus) et `?offset=`, et renvoient `{"items": [...]}`.

## Comptes

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| POST | `/auth/register` | `email`, `password` (8 car. min.), `display_name`, et facultatifs `city`, `position`, `level`, `strong_foot`, `avatar_url` | Crée le compte, renvoie `user` + `token` |
| POST | `/auth/login` | `email`, `password` | Renvoie `user` + `token` |
| POST | `/auth/logout` | | Invalide le jeton utilisé |
| GET | `/me` | | Mon profil (avec e-mail) |
| PATCH | `/me` | Champs du profil à changer | Profil mis à jour |
| GET | `/users/{id}` | | Profil public d'un joueur |

Valeurs : `position` = `gardien`, `defenseur`, `milieu`, `attaquant` ; `level` = 1 à 5 ; `strong_foot` = `droit`, `gauche`, `les_deux`.

## Équipes

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| POST | `/teams` | `name`, et facultatifs `city`, `logo_url`, `usual_format` | Crée l'équipe, le créateur est capitaine |
| GET | `/teams?q=&city=` | | Recherche par nom et ville |
| GET | `/me/teams` | | Mes équipes |
| GET | `/teams/{id}` | | Détail avec les membres ; `invite_code` visible des membres seulement |
| PATCH | `/teams/{id}` | Champs à changer | Capitaine seulement |
| POST | `/teams/join` | `invite_code` | Rejoindre une équipe |
| POST | `/teams/{id}/invite-code` | | Nouveau code (capitaine) |
| POST | `/teams/{id}/captain` | `user_id` | Passer le brassard (capitaine) |
| DELETE | `/teams/{id}/members/me` | | Quitter l'équipe ; le dernier joueur qui part supprime l'équipe |
| DELETE | `/teams/{id}/members/{userId}` | | Retirer un joueur (capitaine) |

Formats : `city5`, `futsal`, `foot8`, `foot11`.

## Terrains

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| POST | `/venues` | `name`, `address`, `lat`, `lng`, et facultatifs `city`, `surface`, `covered` | Ajoute un terrain |
| GET | `/venues?lat=&lng=&radius_km=&q=` | | Autour d'un point (10 km par défaut, trié par distance) et/ou par nom |
| GET | `/venues/{id}` | | Détail |

Surfaces : `city`, `synthetique`, `herbe`, `parquet`, `autre`. L'appli fournit `lat`/`lng` (carte ou GPS du téléphone).

## Matchs

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| POST | `/matches` | `venue_id`, `format`, `starts_at`, et facultatifs `max_players`, `duration_min`, `level`, `home_team_id`, `away_team_id`, `visibility`, `description`, `join` | Crée le match ; l'organisateur est inscrit sauf `"join": false` |
| GET | `/matches?lat=&lng=&radius_km=&format=&from=&to=&level=&spots=1&sort=date` | | Matchs publics à venir (15 km par défaut, triés par distance puis date) |
| GET | `/me/matches?when=upcoming\|past` | | Mes matchs, organisés ou rejoints |
| GET | `/matches/{id}` | | Détail avec la liste des joueurs |
| PATCH | `/matches/{id}` | Champs à changer (sauf `format`) | Organisateur seulement |
| POST | `/matches/{id}/cancel` | | Annule le match (organisateur) |
| POST | `/matches/{id}/join` | facultatif `team_id` | Inscrit s'il reste de la place, sinon liste d'attente |
| DELETE | `/matches/{id}/join` | | Désistement ; le premier en liste d'attente prend la place |

Règles :
- Places par défaut : 10 en city et futsal, 16 en 8 vs 8, 22 en 11 vs 11.
- `level` en recherche garde les matchs sans niveau imposé et ceux à un cran près.
- `spots=1` ne garde que les matchs avec de la place.
- Un match `private` n'apparaît pas dans la recherche mais s'ouvre avec son lien (`/matches/{id}`).
- Statuts : `open`, `full`, `cancelled`, et `played` une fois l'heure de fin passée.
- Si l'organisateur réduit les places, les derniers inscrits repassent en liste d'attente ; s'il en ajoute, la liste d'attente monte.
