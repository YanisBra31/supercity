// Écran d'accueil avant connexion : dégradé, terrain qui se trace, blason, ballon.
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncingBall, FadeIn, Gradient, PitchLines } from '../../components/brand';
import { Button, colors, font, Kicker } from '../../components/ui';

export default function Welcome() {
  return (
    <Gradient style={{ flex: 1 }}>
      <View style={st.pitch} pointerEvents="none">
        <PitchLines width={520} height={320} opacity={0.28} />
      </View>
      <SafeAreaView style={st.safe}>
        <View style={st.top}>
          <FadeIn index={0}>
            <Image source={require('../../../assets/splash-icon.png')} style={st.crest} resizeMode="contain" />
          </FadeIn>
          <FadeIn index={2} style={{ alignItems: 'center', gap: 6 }}>
            <Kicker color={colors.night}>Le foot amateur, réinventé</Kicker>
            <Text style={st.brand}>Supercity</Text>
          </FadeIn>
          <FadeIn index={4}>
            <Text style={st.tagline}>
              Trouve un match, monte ton équipe, défie les autres. <Text style={{ color: colors.night }}>Partout, sur tous les terrains.</Text>
            </Text>
          </FadeIn>
        </View>
        <FadeIn index={6} style={st.bottom}>
          <View style={{ alignItems: 'center', marginBottom: 6 }}>
            <BouncingBall size={22} />
          </View>
          <Button title="Créer mon compte" variant="dark" onPress={() => router.push('/register')} />
          <Button title="J'ai déjà un compte" variant="light" onPress={() => router.push('/login')} />
        </FadeIn>
      </SafeAreaView>
    </Gradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'space-between' },
  pitch: { position: 'absolute', top: '22%', left: '50%', marginLeft: -260, transform: [{ rotate: '-14deg' }] },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  crest: { width: 150, height: 150 },
  brand: { ...font.black, fontSize: 46, lineHeight: 54, color: colors.chalk, letterSpacing: -1.5 },
  tagline: { ...font.medium, fontSize: 17, lineHeight: 25, color: colors.chalk, textAlign: 'center', maxWidth: 320 },
  bottom: { gap: 12, paddingBottom: 8 },
});
