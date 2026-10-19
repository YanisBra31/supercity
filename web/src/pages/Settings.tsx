// Réglages : modération, espace pro, notifications, amis, aide, sécurité, informations légales, déconnexion.
import { Bell, Briefcase, ChevronRight, CircleHelp, Flame, Heart, Lock, LogOut, Radio, Shield, ShieldCheck, Users, Zap } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, Me, NotificationPrefs, patch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Page } from '../ui/Layout';
import { ErrorText, Icon, Kicker } from '../ui/ui';

/** Ligne de menu : icône, titre, sous-titre, flèche. */
function Row({ icon: I, title, text, to, href }: { icon: Icon; title: string; text?: string; to?: string; href?: string }) {
  const inner = (
    <>
      <I size={22} aria-hidden className="set-row__icon" />
      <span className="grow">
        <b>{title}</b>
        {text ? <span className="sub">{text}</span> : null}
      </span>
      <ChevronRight size={18} aria-hidden style={{ color: 'var(--dim)' }} />
    </>
  );
  return href ? (
    <a href={href} className="set-row">
      {inner}
    </a>
  ) : (
    <Link to={to!} className="set-row">
      {inner}
    </Link>
  );
}

function Toggle({ icon: I, title, text, checked, onChange }: { icon: Icon; title: string; text: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="set-row set-row--toggle">
      <I size={22} aria-hidden className="set-row__icon" />
      <span className="grow">
        <b>{title}</b>
        <span className="sub">{text}</span>
      </span>
      <span className="switch" style={{ padding: 0, border: 0 }}>
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stack" style={{ gap: 8 }}>
      <Kicker>{title}</Kicker>
      <div className="card set-group">{children}</div>
    </section>
  );
}

function NotificationSettings({ user, onChange }: { user: Me; onChange: (u: Me) => void }) {
  const prefs = { friends: true, ...(user.notifications ?? { events: true, streaks: true }) };
  const [error, setError] = useState('');
  const set = async (key: keyof NotificationPrefs, value: boolean) => {
    setError('');
    onChange({ ...user, notifications: { ...prefs, [key]: value } });
    try {
      onChange({ ...user, notifications: await patch<NotificationPrefs>('/me/notifications', { [key]: value }) });
    } catch (e) {
      onChange({ ...user, notifications: prefs });
      setError(e instanceof ApiError ? e.message : 'Réglage impossible.');
    }
  };
  return (
    <>
      <Toggle icon={Zap} title="Événements bonus" text="Quand un événement fait gagner plus de points." checked={prefs.events} onChange={(v) => set('events', v)} />
      <Toggle icon={Users} title="Matchs de mes amis" text="Quand un ami organise ou rejoint un match où il reste de la place." checked={prefs.friends} onChange={(v) => set('friends', v)} />
      <Toggle icon={Flame} title="Séries près de chez moi" text="Quand une équipe enchaîne les victoires sur un terrain du coin." checked={prefs.streaks} onChange={(v) => set('streaks', v)} />
      <Row icon={Bell} title="Mes notifications" text="Tout ce que tu as reçu." to="/notifications" />
      {error ? <div style={{ padding: '0 16px 12px' }}><ErrorText>{error}</ErrorText></div> : null}
    </>
  );
}

function PresenceSetting({ user, onChange }: { user: Me; onChange: (u: Me) => void }) {
  const [error, setError] = useState('');
  const visible = user.show_presence ?? true;
  const set = async (v: boolean) => {
    setError('');
    onChange({ ...user, show_presence: v });
    try {
      onChange(await patch<Me>('/me/presence', { visible: v }));
    } catch (e) {
      onChange({ ...user, show_presence: visible });
      setError(e instanceof ApiError ? e.message : 'Réglage impossible.');
    }
  };
  return (
    <>
      <Toggle icon={Radio} title="Montrer mon statut" text="Tes amis voient si tu es en ligne, en match, et ton prochain match." checked={visible} onChange={set} />
      {error ? <div style={{ padding: '0 16px 12px' }}><ErrorText>{error}</ErrorText></div> : null}
    </>
  );
}

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const staff = user.site_role === 'moderator' || user.site_role === 'admin';
  return (
    <Page title="Réglages" back="/profile">
      {staff ? (
        <Group title={user.site_role === 'admin' ? 'Administration' : 'Modération'}>
          <Row icon={ShieldCheck} title="Ouvrir la modération" text="Signalements, joueurs, événements, boutique." to="/moderation" />
        </Group>
      ) : null}
      <Group title="Espace pro">
        <Row icon={Briefcase} title="Mon espace pro" text="Tu gères un five, un club, une association ? Publie des créneaux et des tournois payants." to="/pro" />
      </Group>
      <Group title="Notifications">
        <NotificationSettings user={user} onChange={setUser} />
      </Group>
      <Group title="Amis">
        <Row icon={Heart} title="Mes amis" to="/friends" />
        <PresenceSetting user={user} onChange={setUser} />
      </Group>
      <Group title="Sécurité">
        <Row icon={Lock} title="Changer mon mot de passe" to="/password" />
        <Row icon={Shield} title="Mes données et mon compte" text="Recevoir une copie, supprimer mon compte." to="/account" />
      </Group>
      <Group title="Aide et informations">
        <Row icon={CircleHelp} title="Questions fréquentes" to="/help" />
        <Row icon={Shield} title="Conditions d'utilisation" to="/cgu" />
        <Row icon={Shield} title="Politique de confidentialité" href="/confidentialite/" />
        <Row icon={Shield} title="Mentions légales" to="/mentions" />
      </Group>
      <button
        type="button"
        className="btn btn--ghost btn--block"
        onClick={async () => {
          navigate('/', { replace: true });
          await logout();
        }}
      >
        <LogOut size={19} aria-hidden />
        <span className="btn__label">Se déconnecter</span>
      </button>
    </Page>
  );
}
