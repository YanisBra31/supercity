// Conditions d'utilisation et confidentialité (version provisoire, à faire relire avant la sortie publique).
import { Text, View } from 'react-native';
import { colors, font, Kicker, Screen, Title } from '../components/ui';

const SECTIONS: [string, string][] = [
  [
    'Le service',
    "Supercity met en relation des joueurs de foot amateur pour organiser des matchs, former des équipes et partager leur activité. L'utilisation est gratuite.",
  ],
  [
    'Ton compte',
    "Il faut avoir au moins 15 ans. Tu t'engages à donner des informations exactes, à garder ton mot de passe secret et à ne créer qu'un seul compte. Tu es responsable de ce qui est fait avec ton compte.",
  ],
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
    "On conserve ton e-mail, ton pseudo, ta date de naissance (jamais affichée) et les infos de profil que tu choisis de remplir. Ta position sert uniquement à chercher les matchs proches, elle n'est pas enregistrée. Tes données ne sont ni vendues ni partagées avec des annonceurs.",
  ],
  [
    'Tes droits',
    "Conformément au RGPD, tu peux consulter, corriger ou supprimer tes données à tout moment depuis ton profil ou en écrivant à l'équipe Supercity. Les mots de passe sont chiffrés et nous ne les connaissons pas.",
  ],
  ['Évolutions', "Ces conditions peuvent évoluer ; tu seras prévenu dans l'appli en cas de changement important."],
];

export default function Cgu() {
  return (
    <Screen>
      <Title kicker="Version du 10 octobre 2026" sub="Le résumé de nos règles du jeu, en clair.">
        Conditions d'utilisation
      </Title>
      {SECTIONS.map(([title, text], i) => (
        <View key={title} style={{ gap: 4 }}>
          <Kicker>{`${i + 1}. ${title}`}</Kicker>
          <Text style={{ ...font.regular, fontSize: 14, lineHeight: 22, color: colors.ink }}>{text}</Text>
        </View>
      ))}
    </Screen>
  );
}
