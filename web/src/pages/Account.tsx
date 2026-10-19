// Mes données (RGPD) : en recevoir une copie par e-mail, ou supprimer son compte pour de bon.
import { Mail, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Page } from '../ui/Layout';
import { Button, ErrorText, Field, Kicker, Success, useConfirm } from '../ui/ui';

const WHAT_GOES = [
  'Ton e-mail, ton nom, ta photo, ta date de naissance et ton profil sont effacés.',
  'Tes publications, commentaires, notes et objets de la boutique disparaissent.',
  "Dans les matchs déjà joués, tu apparais comme « Joueur supprimé ». Les paiements restent dans nos comptes, sans ton nom, parce que la loi l'impose.",
  "Si tu es capitaine, ton plus ancien coéquipier reprend l'équipe.",
];

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { ask, dialog } = useConfirm();
  const [sent, setSent] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const sendCopy = async () => {
    setExporting(true);
    setSent('');
    setExportError('');
    try {
      const r = await post<{ sent_to: string }>('/me/export');
      setSent(`C'est envoyé à ${r.sent_to}. Le fichier est en pièce jointe.`);
    } catch (e) {
      setExportError(e instanceof ApiError ? e.message : 'Envoi impossible pour le moment.');
    } finally {
      setExporting(false);
    }
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setFields({});
    setError('');
    if (!(await ask('Supprimer ton compte ?', "C'est définitif : ton profil, tes publications et tes objets disparaissent.", 'Supprimer'))) return;
    setDeleting(true);
    try {
      await api('DELETE', '/me', { body: { password } });
      // On quitte la page avant de se déconnecter, sinon elle renverrait vers la connexion.
      navigate('/', { replace: true });
      await logout();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        if (!Object.keys(err.fields).length) setError(err.message);
      } else setError('Suppression impossible pour le moment.');
      setDeleting(false);
    }
  };

  if (!user) return null;
  return (
    <Page title="Mes données" back="/settings">
      <p className="sub">Tes données t'appartiennent : récupère-les ou fais-les supprimer quand tu veux.</p>

      <Kicker>Recevoir une copie</Kicker>
      <section className="card stack" style={{ gap: 10 }}>
        <p>Profil, matchs, équipes, publications, notes, paiements, objets : on t'envoie tout dans un fichier, à {user.email}.</p>
        <Success>{sent}</Success>
        <ErrorText>{exportError}</ErrorText>
        <Button variant="dark" icon={Mail} loading={exporting} onClick={sendCopy}>
          M'envoyer mes données
        </Button>
      </section>

      <p className="kicker" style={{ color: 'var(--danger)' }}>
        Supprimer mon compte
      </p>
      <form className="card stack" style={{ gap: 12 }} onSubmit={remove}>
        <ul className="bullets">
          {WHAT_GOES.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <Field label="Ton mot de passe, pour confirmer" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} autoComplete="current-password" />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="danger" icon={Trash2} loading={deleting} disabled={!password}>
          Supprimer mon compte
        </Button>
      </form>
      {dialog}
    </Page>
  );
}
