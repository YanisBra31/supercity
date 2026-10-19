// Conditions d'utilisation (version provisoire, à faire relire avant la sortie publique). Même texte que l'appli mobile.
import { Link } from 'react-router';
import { Page } from '../ui/Layout';

const SECTIONS: [string, string][] = [
  ['Le service', "Supercity met en relation des joueurs de foot amateur pour organiser des matchs, former des équipes et partager leur activité. L'utilisation est gratuite."],
  ['Ton compte', "Il faut avoir au moins 15 ans. Tu t'engages à donner des informations exactes, à garder ton mot de passe secret et à ne créer qu'un seul compte. Tu es responsable de ce qui est fait avec ton compte."],
  [
    'Le bon esprit',
    "Pas d'insultes, de harcèlement, de discrimination, de contenus violents ou illégaux, ni d'usurpation d'identité. Respecte les terrains, les horaires et les autres joueurs. Supercity peut retirer un contenu ou suspendre un compte qui ne respecte pas ces règles.",
  ],
  [
    'Les matchs',
    "Les matchs sont organisés par les joueurs eux-mêmes. Supercity n'est ni l'organisateur ni le gestionnaire des terrains et ne peut être tenu responsable des blessures, annulations ou litiges entre joueurs. Vérifie que tu es assuré pour la pratique du football.",
  ],
  [
    'Tes données',
    "On garde ce qu'il faut pour faire tourner l'appli : ton compte, ton profil, ton activité et, si tu l'autorises, une position approchée pour les alertes. Tes données ne sont ni vendues ni utilisées pour de la publicité. Tout est détaillé dans la politique de confidentialité.",
  ],
  [
    'Tes droits',
    "Conformément au RGPD, tu peux corriger ton profil avec « Modifier », recevoir une copie de tes données ou supprimer ton compte dans Réglages > Mes données et mon compte, ou écrire à contact@supercity.fr. Les mots de passe sont chiffrés et nous ne les connaissons pas.",
  ],
  [
    'Paiements et boutique',
    "Les places payantes sont réglées par Stripe ; Supercity ne voit pas tes coordonnées bancaires. Les pièces de la boutique se gagnent en jouant, n'ont aucune valeur en argent et ne sont ni remboursables ni échangeables.",
  ],
  ['Évolutions', "Ces conditions peuvent évoluer ; tu seras prévenu dans l'appli en cas de changement important."],
];

export default function Cgu() {
  return (
    <Page title="Conditions d'utilisation">
      <div className="prose">
        <p className="kicker">Version du 18 octobre 2026</p>
        <p className="sub">Le résumé de nos règles du jeu, en clair.</p>
        {SECTIONS.map(([title, text], i) => (
          <section key={title}>
            <h2>{`${i + 1}. ${title}`}</h2>
            <p>{text}</p>
          </section>
        ))}
        <p>
          <a href="/confidentialite/">Lire la politique de confidentialité</a>
          <br />
          <Link to="/mentions">Voir les mentions légales</Link>
        </p>
      </div>
    </Page>
  );
}
