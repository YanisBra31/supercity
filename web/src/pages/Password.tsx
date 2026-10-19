// Changer son mot de passe depuis les réglages.
import { FormEvent, useState } from 'react';
import { ApiError, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { passwordRules } from '../lib/password';
import { Page, useBack } from '../ui/Layout';
import { PasswordMeter } from '../ui/forms';
import { Button, ErrorText, Field, Success } from '../ui/ui';

export default function Password() {
  const { user } = useAuth();
  const back = useBack('/settings');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const personal = [user?.display_name ?? '', (user?.email ?? '').split('@')[0]];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFields({});
    if (next !== confirm) return setFields({ confirm: 'Les deux mots de passe ne correspondent pas.' });
    setLoading(true);
    try {
      await post('/me/password', { current_password: current, new_password: next });
      setMsg('Mot de passe changé. Tes autres appareils ont été déconnectés.');
      setTimeout(back, 1400);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        if (!Object.keys(err.fields).length) setError(err.message);
      } else setError('Changement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Mot de passe" back="/settings" narrow>
      <p className="sub">Tes autres appareils seront déconnectés.</p>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        {/* Aide les gestionnaires de mots de passe à savoir quel compte est modifié. */}
        <input type="email" name="username" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
        <Field label="Mot de passe actuel" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} error={fields.current_password} autoComplete="current-password" autoFocus />
        <Field label="Nouveau mot de passe" type="password" value={next} onChange={(e) => setNext(e.target.value)} error={fields.new_password} autoComplete="new-password" hint={<PasswordMeter password={next} personal={personal} />} />
        <Field label="Confirme le nouveau" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={fields.confirm} autoComplete="new-password" />
        <ErrorText>{error}</ErrorText>
        <Success>{msg}</Success>
        <Button type="submit" loading={loading} disabled={!current || !passwordRules(next, personal).every((r) => r.ok)} block>
          Changer le mot de passe
        </Button>
      </form>
    </Page>
  );
}
