# Supercity

Site vitrine de [supercity.fr](https://supercity.fr), l'appli de foot amateur : créer son équipe, organiser des matchs city, futsal, 8 vs 8 ou 11 vs 11, partout et sur tous les terrains.

## Stack

- Next.js (App Router) pour le site, à héberger sur Vercel.
- Supabase pour le backend : la liste d'attente d'abord, puis comptes, équipes et matchs pour l'appli mobile.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # facultatif : clés Supabase pour enregistrer la liste d'attente
npm run dev
```

Sans clés Supabase, le formulaire valide l'e-mail et confirme, mais n'enregistre rien.

## Supabase

Les migrations SQL sont dans `supabase/migrations`. La première crée la table `waitlist`, ouverte en écriture et fermée en lecture côté client.
