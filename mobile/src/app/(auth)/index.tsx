// Écran d'accueil avant connexion : dégradé, terrain qui se trace, blason, ballon.
// En mode sombre : fond nuit, le bouton principal passe en orange.
import { router } from 'expo-router';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncingBall, FadeIn, Gradient, PitchLines } from '../../components/brand';
import { Button, colors, font, isDark, Kicker } from '../../components/ui';
import { DesktopWelcome } from '../../components/DesktopWelcome';
import { useWebLayout } from '../../components/WebFrame';

export default function Welcome() {
  const layout = useWebLayout();
  if (layout !== 'phone') return <DesktopWelcome />;
  return (
    <Gradient tone={isDark ? 'night' : 'orange'} style={{ flex: 1 }}>
      <View style={st.pitch} pointerEvents="none">
        <PitchLines width={520} height={320} opacity={0.28} />
      </View>
      <SafeAreaView style={st.safe}>
        <View style={st.top}>
          <FadeIn index={0}>
            <Image source={require('../../../assets/splash-icon.png')} style={st.crest} resizeMode="contain" />
          </FadeIn>
          <FadeIn index={2} style={{ alignItems: 'center', gap: 6 }}>
            <Kicker color={isDark ? colors.orange1 : colors.chalk}>Le foot amateur, réinventé</Kicker>
            <Text style={st.brand}>Supercity</Text>
          </FadeIn>
          <FadeIn index={4}>
            <Text style={st.tagline}>
              Trouve un match, monte ton équipe, défie les autres. <Text style={font.extrabold}>Partout, sur tous les terrains.</Text>
            </Text>
          </FadeIn>
        </View>
        <FadeIn index={6} style={st.bottom}>
          <View style={{ alignItems: 'center', marginBottom: 6 }}>
            <BouncingBall size={22} />
          </View>
          <Button title="Créer mon compte" variant={isDark ? 'primary' : 'dark'} onPress={() => router.push('/register')} />
          <Button title="J'ai déjà un compte" variant="light" onPress={() => router.push('/login')} />
          {Platform.OS === 'web' ? (
            <Text style={st.discover} onPress={() => globalThis.location?.assign('/decouvrir/')}>
              Découvrir Supercity
            </Text>
          ) : null}
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
  // Sur grand écran (web), les boutons gardent une largeur de téléphone.
  discover: { ...font.semibold, fontSize: 14, color: colors.chalk, textAlign: 'center', opacity: 0.85, textDecorationLine: 'underline' },
  bottom: { gap: 12, paddingBottom: 8, width: '100%', maxWidth: 420, alignSelf: 'center' },
});
