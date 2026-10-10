// Mot de passe oublié : e-mail → code reçu → nouveau mot de passe.
import { useState } from 'react';
import { Text } from 'react-native';
import { CodeField, PasswordMeter } from '../../components/forms';
import { Button, colors, ErrorText, Field, font, Screen, Title } from '../../components/ui';
import { ApiError, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { passwordRules } from '../../lib/password';

export default function Forgot() {
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const personal = [email.split('@')[0]];

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setFields({});
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        if (!Object.keys(e.fields).length) setError(e.message);
      } else setError('Action impossible.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <Screen>
        <Title kicker="Pas de panique" sub="Entre ton e-mail, on t'envoie un code pour choisir un nouveau mot de passe.">
          Mot de passe oublié
        </Title>
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="toi@exemple.fr" />
        <ErrorText>{error}</ErrorText>
        <Button
          title="Recevoir un code"
          icon="mail-outline"
          loading={loading}
          disabled={!email.includes('@')}
          onPress={() => run(async () => {
            await post('/auth/password/forgot', { email: email.trim() });
            setStep('code');
          })}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title kicker="Vérifie ta boîte mail" sub={`Si un compte existe pour ${email.trim()}, un code à 6 chiffres vient d'y être envoyé (pense aux spams).`}>
        Nouveau mot de passe
      </Title>
      <CodeField value={code} onChange={setCode} error={fields.code} />
      <Field
        label="Nouveau mot de passe"
        value={password}
        onChangeText={setPassword}
        error={fields.password}
        secureTextEntry
        autoComplete="new-password"
        hint={<PasswordMeter password={password} personal={personal} />}
      />
      <ErrorText>{error}</ErrorText>
      <Button
        title="Changer et me connecter"
        loading={loading}
        disabled={code.length !== 6 || !passwordRules(password, personal).every((r) => r.ok)}
        onPress={() => run(() => resetPassword({ email: email.trim(), code, password }))}
      />
      <Text style={{ ...font.semibold, color: colors.orange2, textAlign: 'center' }} onPress={() => { setCode(''); setStep('email'); }}>
        Renvoyer un code
      </Text>
    </Screen>
  );
}
