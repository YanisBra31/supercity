# Supercity · appli mobile

Appli Expo (React Native) branchée sur l'API de supercity.fr (`../docs/API.md`).

## Essayer l'appli sur ton téléphone

1. Installe **Expo Go** sur ton téléphone (App Store ou Google Play).
2. Sur ton ordinateur (Node.js 20 ou plus) :
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Scanne le QR code affiché : avec l'appareil photo sur iPhone, depuis Expo Go sur Android. Si le téléphone n'est pas sur le même Wi-Fi que l'ordinateur, lance `npx expo start --tunnel`.

L'appli parle à `https://supercity.fr/api/v1`. Pour viser une autre API (un serveur local, par exemple), lance-la avec `EXPO_PUBLIC_API_URL=http://192.168.1.10:8000/api/v1 npx expo start`.

## Écrans

- **Accueil, inscription, connexion** : le jeton est gardé dans le trousseau sécurisé du téléphone.
- **Matchs** : matchs publics autour de toi (5 à 60 km), filtres format et places libres.
- **Organiser** : format, jour, heure, terrain (proche ou nouveau, placé à ta position), niveau, nombre de joueurs, équipe, visibilité.
- **Match** : infos, joueurs, inscription ou liste d'attente, désistement, partage, annulation par l'organisateur.
- **Équipes** : créer, rejoindre avec un code, inviter, passer le brassard, retirer un joueur, quitter.
- **Profil** : poste, niveau, pied fort, prochains matchs, déconnexion.

## Vérifier le code

```bash
npx tsc --noEmit
```

## Publier sur les stores

Plus tard, avec EAS (`npx eas-cli@latest build`). Il faudra un compte Expo, plus un compte Apple Developer (99 $/an) et un compte Google Play (25 $ une fois).
