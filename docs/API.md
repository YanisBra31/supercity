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

Chaque joueur renvoyé par l'API porte un `grade` : `key` (rookie, espoir, titulaire, cadre, star, legende), `label`, `level` (1 à 6), `points` (1 par match joué, 2 par match organisé), `min`, `next_label` et `next_at` (`null` au grade maximum).

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

## Défis entre équipes

Un capitaine invite une autre équipe à l'affronter, soit sur un match de son équipe qui n'a pas encore d'adversaire (`match_id`), soit sur un nouveau créneau (`venue_id`, `format`, `starts_at`). Le capitaine de l'équipe défiée accepte ou refuse.

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| POST | `/challenges` | `from_team_id`, `to_team_id`, `message` facultatif, et `match_id` **ou** `venue_id` + `format` + `starts_at` (+ `duration_min`) | Envoie le défi (capitaine de `from_team_id`) |
| GET | `/me/challenges` | | `{received: [...], sent: [...]}` pour toutes mes équipes ; chaque défi indique `can_respond` et `can_cancel` |
| GET | `/challenges/{id}` | | Détail (membres des deux équipes) |
| POST | `/challenges/{id}/accept` | `message` facultatif | Le match visé reçoit son adversaire, ou un match est créé ; les deux capitaines y sont inscrits avec leur équipe |
| POST | `/challenges/{id}/decline` | `message` facultatif | Refuse |
| POST | `/challenges/{id}/cancel` | | Le capitaine qui a défié retire son défi |
| GET | `/matches/{id}/rivals` | | Équipes qui jouent sur le même terrain à 3 h près : adversaires à défier |

Statuts : `pending`, `accepted`, `declined`, `cancelled`, et `expired` (en attente mais créneau passé).

## Fil d'actualité

| Méthode | Adresse | Corps | Effet |
| --- | --- | --- | --- |
| GET | `/feed` | `?scope=all` (défaut) ou `teams` (moi, mes coéquipiers, mes équipes citées), `?author_id=`, `?before_id=` pour la page suivante, `?limit=` (30 max.) | Publications, les plus récentes d'abord |
| POST | `/posts` | JSON `body`, `team_id` facultatif ; ou multipart avec en plus `photo` | Publie (texte et/ou photo, 1080 px max.) ; 20 publications par heure au plus |
| GET | `/posts/{id}` | | Une publication |
| DELETE | `/posts/{id}` | | Supprime sa publication |
| POST / DELETE | `/posts/{id}/like` | | J'aime / je n'aime plus |
| GET / POST | `/posts/{id}/comments` | `body` (500 car.) pour POST | Commentaires |
| DELETE | `/comments/{id}` | | Supprime un commentaire (son auteur ou l'auteur de la publication) |
| POST | `/posts/{id}/report` | `reason` facultatif | Signale : la publication disparaît pour celui qui signale, et pour tous à 3 signalements |

Chaque publication renvoie `author`, `team`, `match` (pour les défis relevés, publiés automatiquement), `likes_count`, `comments_count`, `liked` et `is_mine`.

## Modération

Chaque joueur porte un `site_role` : `user`, `moderator` ou `admin` (à ne pas confondre avec `role` dans une équipe : `captain` ou `player`). Un modérateur peut supprimer n'importe quelle publication ou commentaire (`can_delete` vaut alors `true`). Un compte suspendu peut lire mais reçoit `403 suspended` sur toute écriture ; `GET /me` renvoie `suspended_until` et `suspended_reason`.

| Méthode | Chemin | Corps | Rôle | Effet |
|---|---|---|---|---|
| GET | `/mod/reports` | | modérateur | Publications signalées : `post`, `reports`, `reasons`, `hidden` |
| POST | `/mod/posts/{id}/keep` | | modérateur | Garde la publication et efface ses signalements |
| GET | `/mod/users?q=` | | modérateur | Recherche par pseudo ou e-mail (2 caractères min.) |
| POST | `/mod/users/{id}/suspend` | `days` (1 à 365), `reason` facultatif | modérateur | Suspend un joueur de rang inférieur |
| DELETE | `/mod/users/{id}/suspend` | | modérateur | Lève la suspension |
| POST | `/admin/users/{id}/role` | `role` : user, moderator, admin | admin | Change le rôle (pas le sien) |

## Espace pro et paiement de la place

Un five, un club, une association ou un coach crée son espace pro (une organisation par compte). Les matchs payants et les tournois sont publiés au nom de cette organisation (`organization_id` à la création) ; un joueur seul ne publie que des matchs gratuits (`409 pro_only`).

Le joueur paie le prix (`price_cents`, de 100 à 5000) plus les frais de service Supercity (`fee_cents`, 50 par défaut) par Stripe Checkout, qui propose la carte, Apple Pay et Google Pay. L'organisation reçoit le prix moins la commission Supercity (`commission_percent` de la config, 10 % par défaut, ou le taux négocié dans `organizations.commission_percent`). Sans bloc `stripe` dans la configuration, les matchs restent gratuits (`503 payments_disabled` si on fixe un prix).

| Méthode | Chemin | Corps | Effet |
|---|---|---|---|
| GET | `/me/organization` | | `organization` (ou null) : `name`, `kind`, `legal_form`, `payouts` (`enabled`, `connected`, `ready`, `fee_cents`, `commission_percent`, `refund_hours`), `stats` (`upcoming`, `places_sold`, `gross_cents`, `commission_cents`, `net_cents`) |
| POST | `/me/organization` | `name`, `kind` (five, club, association, coach, autre), `legal_form` (company, non_profit, individual), `city`, `description` | Crée l'espace pro |
| PATCH | `/me/organization` | mêmes champs | `legal_form` bloquée une fois le compte Stripe créé |
| POST | `/me/organization/onboard` | `return_url` facultatif | Crée le compte Stripe de l'organisation au besoin, renvoie `url` (inscription Stripe) |
| POST | `/me/organization/dashboard` | | Renvoie `url` du tableau de bord Stripe (virements) |
| GET | `/organizations/{id}` | | Page publique et `matches` publics à venir |
| POST | `/matches/{id}/join` | `return_url` facultatif | Match payant : place réservée 30 min (`my_status: pending`), renvoie `checkout_url` |
| POST | `/matches/{id}/pay` | `return_url` facultatif | Nouvelle page de paiement pour une place réservée |
| POST | `/matches/{id}/pay/confirm` | | Vérifie chez Stripe et valide le paiement sans attendre le webhook |
| POST | `/stripe/webhook` | événement Stripe signé | `checkout.session.completed`, `checkout.session.expired`, `account.updated` |
| GET | `/pay/back?to=` | | Page de retour Stripe qui renvoie vers l'appli (`supercity://`, `exp://` ou une origine de `cors_origins`) |

Règles :
- Les vues de match ajoutent `kind` (match, tournament), `title`, `organization`, `price_cents`, `fee_cents`, `my_hold_until`, `my_paid`, et pour l'organisateur `payout_cents` (prix moins commission).
- Tournoi (`kind: tournament`) : espace pro seulement, `title` obligatoire, jusqu'à 200 joueurs et 12 h. Un match reste à 30 joueurs et 4 h au plus. `GET /matches?kind=tournament` ne liste que les tournois.
- Publié pour un espace pro, l'organisateur n'est pas inscrit d'office.
- Place non payée à temps : elle passe au premier de la liste d'attente, qui a 6 h (au plus jusqu'au coup d'envoi) pour payer.
- Paiement arrivé après la fin de la réservation et match complet : remboursé en entier.
- Désistement plus de 24 h avant : prix remboursé, frais gardés (`refunded_cents` dans la réponse). L'organisation rend ce qu'elle a reçu (retour de virement), Supercity rend sa commission. Moins de 24 h : pas de remboursement, et pas de second paiement si le joueur revient.
- Match annulé : tout le monde est remboursé, frais compris.
- Le prix ne change plus une fois qu'un joueur a payé (`409 price_locked`). Les défis entre équipes se font sur des matchs gratuits.
