import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorText, Field, font, Screen, Title, colors } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title kicker="Retour au terrain" sub="Content de te revoir.">Connexion</Title>
      <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="toi@exemple.fr" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
      <ErrorText>{error}</ErrorText>
      <Button title="Se connecter" onPress={submit} loading={loading} />
      <Text style={{ ...font.regular, textAlign: 'center', color: colors.dim }} onPress={() => router.replace('/register')}>
        Pas encore de compte ? <Text style={{ ...font.bold, color: colors.orange2 }}>Inscris-toi</Text>
      </Text>
    </Screen>
  );
}
