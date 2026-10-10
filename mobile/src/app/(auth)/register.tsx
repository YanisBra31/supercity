import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorText, Field, Screen, Title, colors, font } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ display_name: '', email: '', password: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    setFields({});
    setLoading(true);
    try {
      await register({ ...form, email: form.email.trim() });
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        if (!Object.keys(e.fields).length) setError(e.message);
      } else setError('Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title kicker="Nouveau joueur" sub="Une minute pour créer ton profil.">Inscription</Title>
      <Field label="Pseudo" value={form.display_name} onChangeText={set('display_name')} error={fields.display_name} placeholder="Comment on t'appelle sur le terrain" autoComplete="nickname" />
      <Field label="E-mail" value={form.email} onChangeText={set('email')} error={fields.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="toi@exemple.fr" />
      <Field label="Mot de passe" value={form.password} onChangeText={set('password')} error={fields.password} secureTextEntry autoComplete="new-password" placeholder="8 caractères minimum" />
      <ErrorText>{error}</ErrorText>
      <Button title="Créer mon compte" onPress={submit} loading={loading} />
      <Text style={{ ...font.regular, textAlign: 'center', color: colors.dim }} onPress={() => router.replace('/login')}>
        Déjà inscrit ? <Text style={{ ...font.bold, color: colors.orange2 }}>Connecte-toi</Text>
      </Text>
    </Screen>
  );
}
