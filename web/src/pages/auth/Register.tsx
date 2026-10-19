import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { passwordRules } from '../../lib/password';
import { BirthDateField, Checkbox, PasswordMeter } from '../../ui/forms';
import { Button, ErrorText, Field } from '../../ui/ui';
import { AuthFrame } from './AuthFrame';

export default function Register() {
  const { register } = useAuth();
  const { search } = useLocation();
  const [form, setForm] = useState({ display_name: '', email: '', password: '', confirm: '' });
  const [birth, setBirth] = useState('');
  const [terms, setTerms] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFields(({ [k]: _, ...rest }) => rest);
  };
  const personal = [form.display_name, form.email.split('@')[0]];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const local: Record<string, string> = {};
    if (!passwordRules(form.password, personal).every((r) => r.ok)) local.password = 'Le mot de passe ne respecte pas toutes les règles.';
    if (form.confirm !== form.password) local.confirm = 'Les deux mots de passe ne correspondent pas.';
    if (!birth) local.birth_date = 'Indique ta date de naissance.';
    if (!terms) local.accept_terms = "Il faut accepter les conditions d'utilisation.";
    setFields(local);
    if (Object.keys(local).length) return;
    setLoading(true);
    try {
      // Connecté : on part confirmer l'e-mail (voir Guest dans App).
      await register({ display_name: form.display_name, email: form.email.trim(), password: form.password, birth_date: birth, accept_terms: terms });
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        if (!Object.keys(err.fields).length) setError(err.message);
      } else setError('Inscription impossible.');
      setLoading(false);
    }
  };

  return (
    <AuthFrame kicker="Nouveau joueur" title="Inscription" sub="Une minute pour créer ton profil.">
      <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
        <Field label="Pseudo" value={form.display_name} onChange={set('display_name')} error={fields.display_name} placeholder="Comment on t'appelle sur le terrain" autoComplete="nickname" maxLength={40} autoFocus />
        <Field label="E-mail" type="email" value={form.email} onChange={set('email')} error={fields.email} autoComplete="email" placeholder="toi@exemple.fr" />
        <BirthDateField value={birth} onChange={(v) => { setBirth(v); setFields(({ birth_date: _, ...rest }) => rest); }} error={fields.birth_date} />
        <Field
          label="Mot de passe"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={fields.password}
          autoComplete="new-password"
          placeholder="10 caractères, lettres et chiffres"
          hint={<PasswordMeter password={form.password} personal={personal} />}
        />
        <Field label="Confirme le mot de passe" type="password" value={form.confirm} onChange={set('confirm')} error={fields.confirm} autoComplete="new-password" placeholder="Retape-le" />
        <Checkbox checked={terms} onChange={(v) => { setTerms(v); setFields(({ accept_terms: _, ...rest }) => rest); }} error={fields.accept_terms}>
          J'ai lu et j'accepte les{' '}
          <Link to="/cgu" className="link" target="_blank">
            conditions d'utilisation
          </Link>{' '}
          et la{' '}
          <a href="/confidentialite/" className="link" target="_blank">
            politique de confidentialité
          </a>{' '}
          de Supercity.
        </Checkbox>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} block>
          Créer mon compte
        </Button>
      </form>
      <p className="sub" style={{ textAlign: 'center' }}>
        Déjà inscrit ?{' '}
        <Link to={`/login${search}`} className="link">
          Connecte-toi
        </Link>
      </p>
    </AuthFrame>
  );
}
