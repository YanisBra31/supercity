// Changer son mot de passe depuis le profil.
import { router } from 'expo-router';
import { useState } from 'react';
import { PasswordMeter } from '../components/forms';
import { Button, ErrorText, Field, Screen, Success, Title } from '../components/ui';
import { ApiError, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { passwordRules } from '../lib/password';

export default function ChangePassword() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const personal = [user?.display_name ?? '', (user?.email ?? '').split('@')[0]];

  const submit = async () => {
    setError('');
    setFields({});
    if (next !== confirm) return setFields({ confirm: 'Les deux mots de passe ne correspondent pas.' });
    setLoading(true);
    try {
      await post('/me/password', { current_password: current, new_password: next });
      setMsg('Mot de passe changé. Tes autres appareils ont été déconnectés.');
      setTimeout(() => router.back(), 1400);
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        if (!Object.keys(e.fields).length) setError(e.message);
      } else setError('Changement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title kicker="Sécurité" sub="Tes autres appareils seront déconnectés.">Changer de mot de passe</Title>
      <Field label="Mot de passe actuel" value={current} onChangeText={setCurrent} error={fields.current_password} secureTextEntry autoComplete="password" />
      <Field
        label="Nouveau mot de passe"
        value={next}
        onChangeText={setNext}
        error={fields.new_password}
        secureTextEntry
        autoComplete="new-password"
        hint={<PasswordMeter password={next} personal={personal} />}
      />
      <Field label="Confirme le nouveau" value={confirm} onChangeText={setConfirm} error={fields.confirm} secureTextEntry autoComplete="new-password" />
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      <Button title="Changer le mot de passe" loading={loading} disabled={!current || !passwordRules(next, personal).every((r) => r.ok)} onPress={submit} />
    </Screen>
  );
}
