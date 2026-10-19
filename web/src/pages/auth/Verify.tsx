// Confirmation de l'adresse e-mail avec le code reçu.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, Me, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Page } from '../../ui/Layout';
import { CodeField } from '../../ui/forms';
import { Button, ErrorText, Success } from '../../ui/ui';

export default function Verify() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (value = code) => {
    setError('');
    setLoading(true);
    try {
      setUser(await post<Me>('/auth/verify-email', { code: value }));
      setMsg('E-mail confirmé, bienvenue dans l’équipe !');
      setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Vérification impossible.');
    } finally {
      setLoading(false);
    }
  };

  // Validation dès le 6e chiffre.
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
    <Page title="Confirme ton e-mail" narrow>
      <p className="sub">On a envoyé un code à 6 chiffres à <b>{user?.email}</b>. Pense à regarder dans les spams.</p>
      <CodeField value={code} onChange={setCode} />
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      <Button loading={loading} disabled={code.length !== 6} onClick={() => submit()} block>
        Valider
      </Button>
      <button type="button" className="link" onClick={resend}>
        Renvoyer un code
      </button>
      <button type="button" className="link" style={{ color: 'var(--dim)' }} onClick={() => navigate('/', { replace: true })}>
        Plus tard
      </button>
    </Page>
  );
}
