// Mes données (RGPD) : en recevoir une copie par e-mail, ou supprimer son compte pour de bon.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, ErrorText, Field, font, Kicker, Screen, Success, Title } from '../components/ui';
import { api, ApiError, post } from '../lib/api';
import { useAuth } from '../lib/auth';

function confirmDelete(): Promise<boolean> {
  const title = 'Supprimer ton compte ?';
  const text = "C'est définitif : ton profil, tes publications et tes objets disparaissent.";
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n${text}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, text, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const [sent, setSent] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const sendCopy = async () => {
    setExporting(true);
    setSent('');
    setExportError('');
    try {
      const r = await post<{ sent_to: string }>('/me/export');
      setSent(`C'est envoyé à ${r.sent_to}. Le fichier est en pièce jointe.`);
    } catch (e) {
      setExportError(e instanceof ApiError ? e.message : 'Envoi impossible pour le moment.');
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    setFields({});
    setError('');
    if (!(await confirmDelete())) return;
    setDeleting(true);
    try {
      await api('DELETE', '/me', { body: { password } });
      await logout();
      router.replace('/');
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        if (!Object.keys(e.fields).length) setError(e.message);
      } else setError('Suppression impossible pour le moment.');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;
  return (
    <Screen>
      <Title kicker="RGPD" sub="Tes données t'appartiennent : récupère-les ou fais-les supprimer quand tu veux.">Mes données</Title>

      <Kicker>Recevoir une copie</Kicker>
      <Card style={{ gap: 10 }}>
        <Text style={st.text}>
          Profil, matchs, équipes, publications, notes, paiements, objets : on t'envoie tout dans un fichier, à {user.email}.
        </Text>
        <Success>{sent}</Success>
        <ErrorText>{exportError}</ErrorText>
        <Button title="M'envoyer mes données" variant="dark" icon="mail-outline" loading={exporting} onPress={sendCopy} />
      </Card>

      <Kicker color={colors.danger}>Supprimer mon compte</Kicker>
      <Card style={{ gap: 10 }}>
        <View style={{ gap: 6 }}>
          {[
            'Ton e-mail, ton nom, ta photo, ta date de naissance et ton profil sont effacés.',
            'Tes publications, commentaires, notes et objets de la boutique disparaissent.',
            "Dans les matchs déjà joués, tu apparais comme « Joueur supprimé ». Les paiements restent dans nos comptes, sans ton nom, parce que la loi l'impose.",
            "Si tu es capitaine, ton plus ancien coéquipier reprend l'équipe.",
          ].map((t) => (
            <Text key={t} style={st.bullet}>
              • {t}
            </Text>
          ))}
        </View>
        <Field label="Ton mot de passe, pour confirmer" value={password} onChangeText={setPassword} error={fields.password} secureTextEntry autoComplete="password" />
        <ErrorText>{error}</ErrorText>
        <Button title="Supprimer mon compte" variant="danger" icon="trash-outline" loading={deleting} disabled={!password} onPress={remove} />
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  text: { ...font.medium, fontSize: 14, lineHeight: 21, color: colors.ink },
  bullet: { ...font.medium, fontSize: 13.5, lineHeight: 20, color: colors.dim },
});
