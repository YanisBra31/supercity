import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { BirthDateField, Checkbox, PasswordMeter } from '../../components/forms';
import { Button, colors, ErrorText, Field, font, Screen, Title } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { passwordRules } from '../../lib/password';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ display_name: '', email: '', password: '', confirm: '' });
  const [birth, setBirth] = useState('');
  const [terms, setTerms] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFields(({ [k]: _, ...rest }) => rest);
  };
  const onBirth = useCallback((v: string) => setBirth(v), []);
  const personal = [form.display_name, form.email.split('@')[0]];

  const submit = async () => {
    setError('');
    const local: Record<string, string> = {};
    if (!passwordRules(form.password, personal).every((r) => r.ok)) local.password = 'Le mot de passe ne respecte pas toutes les règles.';
    if (form.confirm !== form.password) local.confirm = 'Les deux mots de passe ne correspondent pas.';
    if (!birth) local.birth_date = 'Indique ta date de naissance complète.';
    if (!terms) local.accept_terms = "Il faut accepter les conditions d'utilisation.";
    setFields(local);
    if (Object.keys(local).length) return;
    setLoading(true);
    try {
      await register({ display_name: form.display_name, email: form.email.trim(), password: form.password, birth_date: birth, accept_terms: terms });
      router.replace('/verify');
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
      <Field label="Pseudo" value={form.display_name} onChangeText={set('display_name')} error={fields.display_name} placeholder="Comment on t'appelle sur le terrain" autoComplete="nickname" maxLength={40} />
      <Field label="E-mail" value={form.email} onChangeText={set('email')} error={fields.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="toi@exemple.fr" />
      <BirthDateField value={birth} onChange={onBirth} error={fields.birth_date} />
      <Field
        label="Mot de passe"
        value={form.password}
        onChangeText={set('password')}
        error={fields.password}
        secureTextEntry
        autoComplete="new-password"
        placeholder="10 caractères, lettres et chiffres"
        hint={<PasswordMeter password={form.password} personal={personal} />}
      />
      <Field label="Confirme le mot de passe" value={form.confirm} onChangeText={set('confirm')} error={fields.confirm} secureTextEntry autoComplete="new-password" placeholder="Retape-le" />
      <Checkbox checked={terms} onChange={(v) => { setTerms(v); setFields(({ accept_terms: _, ...rest }) => rest); }} error={fields.accept_terms}>
        J'ai lu et j'accepte les{' '}
        <Link href="/cgu" style={{ ...font.bold, color: colors.orange2 }}>
          conditions d'utilisation
        </Link>{' '}
        et la politique de confidentialité de Supercity.
      </Checkbox>
      <ErrorText>{error}</ErrorText>
      <Button title="Créer mon compte" onPress={submit} loading={loading} />
      <Text style={{ ...font.regular, textAlign: 'center', color: colors.dim }} onPress={() => router.replace('/login')}>
        Déjà inscrit ? <Text style={{ ...font.bold, color: colors.orange2 }}>Connecte-toi</Text>
      </Text>
    </Screen>
  );
}
