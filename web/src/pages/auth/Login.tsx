import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, ErrorText, Field } from '../../ui/ui';
import { AuthFrame } from './AuthFrame';

export default function Login() {
  const { login } = useAuth();
  const { search } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Une fois connecté, on repart vers la page demandée (voir Guest dans App).
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
      setLoading(false);
    }
  };

  return (
    <AuthFrame kicker="Retour au terrain" title="Connexion" sub="Content de te revoir.">
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="toi@exemple.fr" required autoFocus />
        <Field label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <Link to="/forgot" className="link" style={{ alignSelf: 'flex-end', fontSize: 14 }}>
          Mot de passe oublié ?
        </Link>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} block>
          Se connecter
        </Button>
      </form>
      <p className="sub" style={{ textAlign: 'center' }}>
        Pas encore de compte ?{' '}
        <Link to={`/register${search}`} className="link">
          Inscris-toi
        </Link>
      </p>
    </AuthFrame>
  );
}
