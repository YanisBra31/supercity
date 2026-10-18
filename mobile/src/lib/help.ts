// Questions fréquentes de la page Aide. Les chiffres suivent les règles de l'API (payments.php, series.php, cards.php, shop.php).
export type HelpItem = { id: string; q: string; a: string };
export type HelpTopic = { title: string; items: HelpItem[] };

export const HELP_EMAIL = 'contact@supercity.fr';

export const HELP: HelpTopic[] = [
  {
    title: 'Matchs',
    items: [
      {
        id: 'rejoindre',
        q: 'Comment rejoindre un match ?',
        a: "Ouvre le match et touche « Je joue ». Si le match est payant, un récapitulatif s'affiche avec le prix total : tu confirmes, puis tu paies sur la page sécurisée de Stripe.",
      },
      {
        id: 'attente',
        q: "Comment marche la liste d'attente ?",
        a: "Quand un match est complet, tu peux t'inscrire en liste d'attente. Si une place se libère, elle va au premier de la liste. Pour un match payant, tu as alors 6 heures pour payer ta place, sinon elle passe au suivant.",
      },
      {
        id: 'annuler',
        q: 'Je ne peux plus venir, comment annuler ?',
        a: "Ouvre le match et désinscris-toi. Ta place va au premier joueur en liste d'attente. Sur un match payant, tu es remboursé du prix de la place si tu annules plus de 24 h avant le coup d'envoi ; les frais de service restent dus. Après, la place n'est plus remboursée.",
      },
      {
        id: 'frais',
        q: 'À quoi servent les frais de service ?',
        a: "Ils s'ajoutent au prix de la place sur les matchs payants et couvrent le paiement en ligne et le fonctionnement de Supercity. Le total à payer est toujours affiché avant de confirmer.",
      },
      {
        id: 'annule',
        q: "Et si l'organisateur annule le match ?",
        a: "Le match passe en « Annulé » sur sa page. Sur un match payant, tu es remboursé en entier, frais de service compris.",
      },
      {
        id: 'organiser',
        q: 'Comment organiser un match ?',
        a: "Onglet « Organiser » : choisis le format, le terrain, le jour et l'heure, puis publie. Les joueurs autour du terrain sont prévenus. Organiser un match te rapporte aussi des points de grade.",
      },
    ],
  },
  {
    title: 'Équipes et défis',
    items: [
      {
        id: 'equipe',
        q: 'Comment créer ou rejoindre une équipe ?',
        a: "Onglet « Équipes » : crée la tienne (tu en deviens le capitaine) ou cherche une équipe qui recrute.",
      },
      {
        id: 'defi',
        q: 'Comment défier une autre équipe ?',
        a: "Depuis la page d'une équipe ou d'un match, touche « Défier ». Si l'autre capitaine accepte, le match est créé et les deux capitaines y sont inscrits.",
      },
      {
        id: 'score',
        q: 'Comment le score est-il validé ?',
        a: "Après le match, un capitaine annonce le score et l'autre le confirme. Sans réponse sous 48 h, le score annoncé compte. Si les deux capitaines ne sont pas d'accord, la modération tranche.",
      },
      {
        id: 'serie',
        q: "Que veulent dire la flamme et le roi du terrain ?",
        a: "Une équipe qui gagne 3 matchs d'affilée est « en feu ». Le roi du terrain est l'équipe qui a la plus longue série de victoires en cours sur ce terrain (au moins 2).",
      },
    ],
  },
  {
    title: 'Grade et carte joueur',
    items: [
      {
        id: 'grade',
        q: 'Comment monter de grade ?',
        a: "Chaque match joué rapporte 1 point, une victoire 2 points de plus, et chaque match organisé 2 points. Les événements bonus peuvent multiplier les points. Grades : Rookie, Espoir (5), Titulaire (15), Cadre (30), Star (60), Légende (120).",
      },
      {
        id: 'carte',
        q: 'Comment sont calculées les stats de ma carte ?',
        a: "Au départ, c'est ton estimation, en étoiles, dans « Modifier ». Ensuite, les joueurs qui ont joué avec toi te notent et leurs votes prennent peu à peu le relais. Ta carte est confirmée à partir de 3 votes. Estime-toi honnêtement !",
      },
      {
        id: 'noter',
        q: 'Comment noter mes coéquipiers ?',
        a: "Après un match, « Noter les joueurs » apparaît sur sa page pendant 7 jours. Donne des étoiles à chacun et, si tu veux, son point fort. Tu peux changer ta note tant que c'est ouvert.",
      },
    ],
  },
  {
    title: 'Boutique',
    items: [
      {
        id: 'pieces',
        q: 'Comment gagner des pièces ?',
        a: "En jouant : chaque point de grade te rapporte 10 pièces. Joue, gagne et organise des matchs pour en avoir plus.",
      },
      {
        id: 'inventaire',
        q: 'Où retrouver les objets que j\'ai achetés ?',
        a: "Dans la boutique, touche « Mon inventaire ». Tous tes cadres, bannières et titres y sont rangés : touche un objet pour le porter, touche-le encore pour le retirer.",
      },
      {
        id: 'cosmetiques',
        q: 'Que puis-je acheter avec mes pièces ?',
        a: "Des cadres, bannières et titres pour personnaliser ton profil. Ils ne changent ni ton grade ni tes points. Les pièces n'ont aucune valeur en argent : un objet acheté reste à toi, il n'est ni remboursable ni échangeable.",
      },
    ],
  },
  {
    title: 'Compte et sécurité',
    items: [
      {
        id: 'notifs',
        q: 'Je ne reçois pas les notifications',
        a: "Va dans Réglages et active-les sur ce téléphone. Si elles sont bloquées, autorise Supercity dans les réglages du téléphone. Les scores à confirmer pour ton équipe te sont toujours envoyés.",
      },
      {
        id: 'signaler',
        q: 'Comment signaler un contenu ou un joueur ?',
        a: "Touche les « … » sur une publication pour la signaler. Les publications signalées plusieurs fois sont masquées, et la modération vérifie. Reste fair-play !",
      },
      {
        id: 'sombre',
        q: 'Comment passer en mode sombre ?',
        a: "Supercity suit le réglage de ton téléphone. Change-le, puis rouvre l'appli.",
      },
      {
        id: 'compte',
        q: 'Comment supprimer mon compte ?',
        a: `Écris-nous à ${HELP_EMAIL} depuis l'adresse de ton compte et nous le supprimons.`,
      },
    ],
  },
  {
    title: 'Espace pro',
    items: [
      {
        id: 'pro',
        q: "C'est quoi l'espace pro ?",
        a: "Pour les fives, clubs, associations et coachs : publie des créneaux et des tournois payants. Les joueurs paient dans l'appli, et tu reçois l'argent par virement, commission Supercity déduite. Stripe te demande les infos de ta structure et son RIB une seule fois.",
      },
    ],
  },
];
