// Confirmation de l'adresse e-mail avec le code reçu.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BouncingBall } from '../components/brand';
import { CodeField } from '../components/forms';
import { Button, colors, ErrorText, font, Screen, Success, Title } from '../components/ui';
import { ApiError, Me, post } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Verify() {
  const { user, setUser } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const done = () => router.replace('/(tabs)');

  const submit = async (value = code) => {
    setError('');
    setLoading(true);
    try {
      setUser(await post<Me>('/auth/verify-email', { code: value }));
      setMsg('E-mail confirmé, bienvenue dans l’équipe !');
      setTimeout(done, 900);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Vérification impossible.');
    } finally {
      setLoading(false);
    }
  };

  // Validation automatique dès le 6e chiffre.
  useEffect(() => {
    if (code.length === 6) submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    setError('');
    setMsg('');
    try {
      await post('/auth/resend-code');
      setMsg('Nouveau code envoyé.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Envoi impossible.');
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <BouncingBall size={34} />
      </View>
      <Title kicker="Dernière étape" sub={`On a envoyé un code à 6 chiffres à ${user?.email}. Pense à regarder dans les spams.`}>
        Confirme ton e-mail
      </Title>
      <CodeField value={code} onChange={setCode} />
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      <Button title="Valider" loading={loading} disabled={code.length !== 6} onPress={() => submit()} />
      <Text style={{ ...font.semibold, color: colors.orange2, textAlign: 'center' }} onPress={resend}>
        Renvoyer un code
      </Text>
      <Text style={{ ...font.regular, color: colors.dim, textAlign: 'center' }} onPress={done}>
        Plus tard
      </Text>
    </Screen>
  );
}
