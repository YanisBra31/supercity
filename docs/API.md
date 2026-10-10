# API Supercity v1

Adresse de base : `https://supercity.fr/api/v1`. Corps et réponses en JSON, dates en ISO 8601 (renvoyées en UTC, suffixe `Z`).

Toutes les routes sauf `/health`, `/auth/register`, `/auth/login` et `/auth/password/*` demandent l'en-tête `Authorization: Bearer <jeton>`. Le jeton est valable 60 jours.

En cas d'erreur, la réponse ressemble à `{"error": "validation_failed", "message": "...", "fields": {"email": "Adresse e-mail invalide."}}`.

| Code | Sens |
| --- | --- |
| 401 `unauthenticated` / `invalid_credentials` | Pas connecté, ou mauvais identifiants |
| 403 `forbidden` | Action réservée au capitaine ou à l'organisateur |
| 404 `not_found` | Ressource ou adresse inconnue |
| 409 | Conflit : e-mail déjà pris, match annulé ou joué, capitaine qui part sans passer le brassard |
| 422 `validation_failed` / `invalid_code` | Champs invalides, détaillés dans `fields`, ou code e-mail faux ou expiré |
| 429 `too_many_attempts` | Trop d'essais (connexion, inscription, codes, e-mails) : réessayer plus tard |

Les listes acceptent `?limit=` (20 par défaut, 50 au plus) et `?offset=`, et renvoient `{"items": [...]}`.

## Comptes

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| POST | `/auth/register` | `email`, `password`, `display_name`, `birth_date` (AAAA-MM-JJ, 15 ans min.), `accept_terms: true`, et facultatifs `city`, `position`, `level`, `strong_foot`, `avatar_url` | Crée le compte, envoie un code de vérification par e-mail, renvoie `user` + `token` |
| POST | `/auth/login` | `email`, `password` | Renvoie `user` + `token`. Bloqué 15 min après 5 échecs sur un compte (ou 30 depuis une même IP) |
| POST | `/auth/verify-email` | `code` | Confirme l'e-mail, renvoie le profil |
| POST | `/auth/resend-code` | | Renvoie un code de vérification |
| POST | `/auth/password/forgot` | `email` | Envoie un code de réinitialisation (réponse 204 que le compte existe ou non) |
| POST | `/auth/password/reset` | `email`, `code`, `password` | Change le mot de passe, coupe toutes les sessions, renvoie `user` + `token` |
| POST | `/me/password` | `current_password`, `new_password` | Change le mot de passe, coupe les autres sessions |
| POST | `/auth/logout` | | Invalide le jeton utilisé |
| GET | `/me` | | Mon profil (avec e-mail) |
| PATCH | `/me` | Champs du profil à changer | Profil mis à jour |
| POST | `/me/avatar` | Formulaire multipart, champ `photo` (JPEG, PNG ou WebP, 6 Mo max.) | Photo recadrée en carré 512 px, renvoie le profil |
| DELETE | `/me/avatar` | | Retire la photo |
| GET | `/users/{id}` | | Profil public d'un joueur, avec `stats` (`played`, `organized`), `teams` et `member_since` |

Mot de passe : 10 caractères minimum, au moins une lettre et un chiffre, pas un mot de passe courant, sans le pseudo ni le début de l'e-mail. Les codes e-mail ont 6 chiffres, valent 30 minutes et 5 essais ; 3 e-mails au plus par compte et par heure. `/me` renvoie aussi `email_verified` et `birth_date`.

Champs de profil en plus : `bio` (160 car.), `shirt_number` (0 à 99), `favorite_club`, `accent` (`orange`, `nuit`, `rouge`, `bleu`, `vert`, `violet`, couleur de la carte du joueur).

Valeurs : `position` = `gardien`, `defenseur`, `milieu`, `attaquant` ; `level` = 1 à 5 ; `strong_foot` = `droit`, `gauche`, `les_deux`.

## Équipes

Personnalisation (création et `PATCH`, capitaine seulement) : `description` (300 car.), `color_primary` et `color_secondary` (`#rrggbb`), `founded_year`, `recruiting` (booléen). Logo : `POST /teams/{id}/logo` (multipart, champ `photo`, rendu en PNG carré 512 px) et `DELETE /teams/{id}/logo`.

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
