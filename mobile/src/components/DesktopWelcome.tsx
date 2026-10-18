// Accueil de l'appli web sur ordinateur, avant connexion : grand titre, inscription, connexion directe,
// et le blason en grand. Sur téléphone, c'est l'écran d'accueil habituel qui s'affiche.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { brand, Gradient, PitchLines } from './brand';
import { font } from './ui';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

type Hover = { pressed: boolean; hovered?: boolean };

const FOOTER: [string, () => void][] = [
  ['Le site', () => globalThis.location?.assign('/')],
  ['Aide', () => router.push('/help')],
  ['Conditions', () => router.push('/cgu')],
  ['Confidentialité', () => globalThis.open?.('/confidentialite/', '_blank')],
  ['Mentions légales', () => router.push('/mentions')],
];

function DarkField(props: React.ComponentProps<typeof TextInput>) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor="rgba(255,248,241,.45)"
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[st.input, focus && { borderColor: brand.orange1 }]}
      {...props}
    />
  );
}

export function DesktopWelcome() {
  const { width } = useWindowDimensions();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const side = width >= 1000;

  const submit = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connexion impossible.');
      setLoading(false);
    }
  };

  return (
    <View style={st.page}>
      <View style={st.main}>
        <View style={[st.left, !side && { alignItems: 'center' }]}>
          <View style={st.form}>
            {!side ? <Image source={require('../../assets/splash-icon.png')} style={{ width: 72, height: 72, marginBottom: 8 }} resizeMode="contain" /> : null}
            <Text style={st.title} accessibilityRole="header">
              Ça joue près{'\n'}de chez toi<Text style={{ color: brand.orange1 }}>.</Text>
            </Text>
            <Text style={st.sub}>Inscris-toi, c'est gratuit.</Text>

            <Pressable
              onPress={() => router.push('/register')}
              accessibilityRole="button"
              style={(s) => [st.white, (s as Hover).hovered && { backgroundColor: '#f1e7de' }]}
            >
              <Ionicons name="football" size={20} color={brand.night} />
              <Text style={st.whiteText}>Créer mon compte</Text>
            </Pressable>

            <View style={st.or}>
              <View style={st.orLine} />
              <Text style={st.orText}>ou connecte-toi</Text>
              <View style={st.orLine} />
            </View>

            <DarkField value={email} onChangeText={setEmail} placeholder="Adresse e-mail" autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="Adresse e-mail" />
            <DarkField value={password} onChangeText={setPassword} placeholder="Mot de passe" secureTextEntry autoComplete="password" onSubmitEditing={submit} accessibilityLabel="Mot de passe" />
            {error ? <Text style={st.error}>{error}</Text> : null}
            <Pressable
              onPress={submit}
              disabled={!email.trim() || !password}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              style={(s) => [st.go, (!email.trim() || !password) && { opacity: 0.4 }, (s as Hover).hovered && { transform: [{ scale: 1.01 }] }]}
            >
              <Gradient style={StyleSheet.absoluteFill} />
              {loading ? <ActivityIndicator color={brand.chalk} /> : <Text style={st.goText}>Se connecter</Text>}
            </Pressable>
            <Text style={st.forgot} onPress={() => router.push('/forgot')}>
              Mot de passe oublié ?
            </Text>

            <Text style={st.legal}>
              En continuant, tu acceptes les{' '}
              <Text style={st.legalLink} onPress={() => router.push('/cgu')}>
                Conditions d'utilisation
              </Text>{' '}
              et la{' '}
              <Text style={st.legalLink} onPress={() => globalThis.open?.('/confidentialite/', '_blank')}>
                Politique de confidentialité
              </Text>
              .
            </Text>
          </View>
        </View>

        {side ? (
          <View style={st.right} pointerEvents="box-none">
            <View style={st.pitch} pointerEvents="none">
              <PitchLines width={820} height={510} opacity={0.14} />
            </View>
            <Image source={require('../../assets/splash-icon.png')} style={st.crest} resizeMode="contain" accessibilityLabel="Blason Supercity" />
            <View style={st.card}>
              <Image source={require('../../assets/icon.png')} style={{ width: 48, height: 48, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.cardTitle}>Sur ton téléphone</Text>
                <Text style={st.cardText}>Ouvre supercity.fr/app et ajoute-la à ton écran d'accueil. Appli iOS et Android bientôt.</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={st.footer}>
        {FOOTER.map(([t, go]) => (
          <Text key={t} style={st.footerLink} onPress={go}>
            {t}
          </Text>
        ))}
        <Text style={st.footerText}>© 2026 Supercity</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0f0c0b' },
  main: { flex: 1, flexDirection: 'row' },
  left: { flex: 1, justifyContent: 'center', paddingHorizontal: 48, paddingLeft: '10%' },
  form: { width: '100%', maxWidth: 440, gap: 14 },
  title: { ...font.black, fontSize: 62, lineHeight: 66, letterSpacing: -2.5, color: brand.chalk, marginBottom: 18 },
  sub: { ...font.extrabold, fontSize: 24, color: brand.chalk, marginBottom: 6 },
  white: { height: 52, borderRadius: 26, backgroundColor: brand.chalk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  whiteText: { ...font.bold, fontSize: 16, color: brand.night },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,248,241,.16)' },
  orText: { ...font.medium, fontSize: 14, color: 'rgba(255,248,241,.6)' },
  input: { height: 56, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,248,241,.22)', paddingHorizontal: 16, ...font.regular, fontSize: 16, color: brand.chalk, outlineStyle: 'none' } as object,
  error: { ...font.medium, fontSize: 14, color: '#ff8a7a' },
  go: { height: 52, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  goText: { ...font.bold, fontSize: 16, color: brand.chalk },
  forgot: { ...font.semibold, fontSize: 14, color: brand.orange1, textAlign: 'center' },
  legal: { ...font.regular, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,248,241,.55)', textAlign: 'center', marginTop: 6 },
  legalLink: { textDecorationLine: 'underline', color: 'rgba(255,248,241,.8)' },
  right: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pitch: { position: 'absolute', top: '50%', left: '50%', marginLeft: -410, marginTop: -255, transform: [{ rotate: '-14deg' }] },
  crest: { width: '62%', maxWidth: 460, aspectRatio: 1, opacity: 0.95 },
  card: { position: 'absolute', right: 32, bottom: 24, width: 330, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, backgroundColor: '#1d1816', borderWidth: 1, borderColor: 'rgba(255,248,241,.1)' },
  cardTitle: { ...font.bold, fontSize: 15, color: brand.chalk },
  cardText: { ...font.regular, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,248,241,.7)' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 24 },
  footerLink: { ...font.regular, fontSize: 12.5, color: 'rgba(255,248,241,.55)', paddingHorizontal: 6 },
  footerText: { ...font.regular, fontSize: 12.5, color: 'rgba(255,248,241,.4)', paddingHorizontal: 6 },
});
