// Écran d'accueil avant connexion.
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors } from '../../components/ui';

export default function Welcome() {
  return (
    <SafeAreaView style={st.bg}>
      <View style={st.top}>
        <Image source={require('../../../assets/splash-icon.png')} style={st.crest} resizeMode="contain" />
        <Text style={st.brand}>Supercity</Text>
        <Text style={st.tagline}>Le foot amateur, partout, sur tous les terrains.</Text>
      </View>
      <View style={st.bottom}>
        <Button title="Créer mon compte" variant="dark" onPress={() => router.push('/register')} />
        <Button title="J'ai déjà un compte" variant="light" onPress={() => router.push('/login')} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.orange2, padding: 24, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  crest: { width: 170, height: 170 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  tagline: { fontSize: 18, color: colors.white, textAlign: 'center', opacity: 0.95, maxWidth: 300, lineHeight: 25 },
  bottom: { gap: 12, paddingBottom: 8 },
});
