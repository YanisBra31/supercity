// Mot de passe oublié : e-mail, puis code reçu et nouveau mot de passe.
import { Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ApiError, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { passwordRules } from '../../lib/password';
import { CodeField, PasswordMeter } from '../../ui/forms';
import { Button, ErrorText, Field } from '../../ui/ui';
import { AuthFrame } from './AuthFrame';

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
    const send = (e: FormEvent) => {
      e.preventDefault();
      run(async () => {
        await post('/auth/password/forgot', { email: email.trim() });
        setStep('code');
      });
    };
    return (
      <AuthFrame kicker="Pas de panique" title="Mot de passe oublié" sub="Entre ton e-mail, on t'envoie un code pour choisir un nouveau mot de passe.">
        <form className="stack" style={{ gap: 14 }} onSubmit={send}>
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="toi@exemple.fr" autoFocus />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" icon={Mail} loading={loading} disabled={!email.includes('@')} block>
            Recevoir un code
          </Button>
        </form>
      </AuthFrame>
    );
  }

  const reset = (e: FormEvent) => {
    e.preventDefault();
    run(() => resetPassword({ email: email.trim(), code, password }));
  };
  return (
    <AuthFrame kicker="Vérifie ta boîte mail" title="Nouveau mot de passe" sub={`Si un compte existe pour ${email.trim()}, un code à 6 chiffres vient d'y être envoyé (pense aux spams).`}>
      <form className="stack" style={{ gap: 14 }} onSubmit={reset}>
        <CodeField value={code} onChange={setCode} error={fields.code} />
        <Field
          label="Nouveau mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password}
          autoComplete="new-password"
          hint={<PasswordMeter password={password} personal={personal} />}
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} disabled={code.length !== 6 || !passwordRules(password, personal).every((r) => r.ok)} block>
          Changer et me connecter
        </Button>
        <button type="button" className="link" onClick={() => { setCode(''); setStep('email'); }}>
          Renvoyer un code
        </button>
      </form>
    </AuthFrame>
  );
}
