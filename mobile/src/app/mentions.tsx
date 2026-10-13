// Mentions légales de l'appli : éditeur, hébergeur, prestataires. Mêmes informations que le site (app/legal.ts) : les changer aux deux endroits.
import { Link } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { colors, font, Kicker, Screen, Title } from '../components/ui';

const LEGAL = {
  editeur: 'Yanis Yahia',
  statut: 'particulier',
  adresse: '31400 Toulouse, France',
  email: 'contact@supercity.fr',
  directeur: 'Yanis Yahia',
  majLe: '13 octobre 2026',
};

const body = { ...font.regular, fontSize: 14, lineHeight: 22, color: colors.ink };
const link = { ...font.bold, color: colors.orange2 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Kicker>{title}</Kicker>
      <Text style={body}>{children}</Text>
    </View>
  );
}

export default function Mentions() {
  return (
    <Screen>
      <Title kicker={`Mise à jour le ${LEGAL.majLe}`} sub="Qui édite Supercity, où l'appli est hébergée et avec qui elle travaille.">
        Mentions légales
      </Title>
      <Section title="Éditeur">
        L'appli Supercity et le site supercity.fr sont édités par {LEGAL.editeur}, {LEGAL.statut}, {LEGAL.adresse}.{'\n'}
        Contact :{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${LEGAL.email}`)}>
          {LEGAL.email}
        </Text>
        {'\n'}Directeur de la publication : {LEGAL.directeur}.
      </Section>
      <Section title="Hébergeur">
        Hostinger International Ltd, 61 Lordou Vironos Street, 6023 Larnaca, Chypre,{' '}
        <Text style={link} onPress={() => Linking.openURL('https://www.hostinger.fr')}>
          hostinger.fr
        </Text>
        . Les comptes, matchs, équipes et publications y sont stockés.
      </Section>
      <Section title="Paiements">
        Les places payantes sont réglées sur Stripe Payments Europe Ltd (Dublin, Irlande). Supercity ne voit ni ne conserve
        tes coordonnées bancaires. Le paiement est versé directement à la structure qui organise.
      </Section>
      <Section title="Notifications">
        Les notifications passent par Expo (650 Industries, États-Unis), puis par Google Firebase sur Android ou Apple sur
        iPhone. Seuls un identifiant de téléphone et le texte de l'alerte leur sont transmis.
      </Section>
      <Section title="Propriété intellectuelle">
        Le nom Supercity, l'écusson, les textes, les visuels et l'interface de l'appli appartiennent à leur éditeur. Toute
        reproduction sans autorisation écrite est interdite. Les photos et publications restent la propriété de leurs auteurs,
        qui autorisent leur affichage dans l'appli.
      </Section>
      <Section title="Tes données">
        Ce qu'on garde et tes droits sont expliqués dans les{' '}
        <Link href="/cgu" style={link}>
          conditions d'utilisation
        </Link>
        . Pour toute demande, écris à {LEGAL.email}.
      </Section>
    </Screen>
  );
}
