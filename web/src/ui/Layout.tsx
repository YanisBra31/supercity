// Cadre de l'appli connectée : menu à gauche (ordinateur), contenu au centre, colonne de droite (grand écran),
// barre d'onglets en bas (téléphone). Toutes les pages s'affichent dedans, réglages et pages légales compris.
import { ArrowLeft, Bell, Heart, Newspaper, Plus, PlusCircle, Settings, Trophy, User, Users } from 'lucide-react';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import icon from '../assets/icon.png';
import { Friends, get, Match } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useBadge } from '../lib/badge';
import { formatLabel, whenLabel } from '../lib/format';
import { PresenceDot } from './social';
import { Avatar, Icon, Loading } from './ui';

type Nav = { to: string; label: string; icon: Icon; badge?: 'unread' | 'friend_requests'; end?: boolean };

const SIDE: Nav[] = [
  { to: '/', label: 'Matchs', icon: Trophy, end: true },
  { to: '/feed', label: 'Fil', icon: Newspaper },
  { to: '/teams', label: 'Équipes', icon: Users },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  { to: '/friends', label: 'Amis', icon: Heart, badge: 'friend_requests' },
  { to: '/profile', label: 'Profil', icon: User },
  { to: '/settings', label: 'Réglages', icon: Settings },
];

const TABS: Nav[] = [
  { to: '/', label: 'Matchs', icon: Trophy, end: true },
  { to: '/feed', label: 'Fil', icon: Newspaper },
  { to: '/create', label: 'Organiser', icon: PlusCircle },
  { to: '/teams', label: 'Équipes', icon: Users },
  { to: '/profile', label: 'Profil', icon: User, badge: 'unread' },
];

function Count({ n }: { n: number }) {
  return n ? <span className="dot-badge">{n > 99 ? '99+' : n}</span> : null;
}

function Side() {
  const badge = useBadge();
  const { user } = useAuth();
  return (
    <aside className="side" aria-label="Menu principal">
      <Link to="/" className="side__logo" aria-label="Supercity, accueil">
        <img src={icon} alt="" />
        <span>Supercity</span>
      </Link>
      <nav className="side__nav">
        {SIDE.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="side__item" title={n.label}>
            <n.icon size={25} aria-hidden />
            <span className="side__label">{n.label}</span>
            {n.badge ? <Count n={badge[n.badge]} /> : null}
          </NavLink>
        ))}
      </nav>
      <Link to="/create" className="btn btn--primary side__cta" aria-label="Organiser un match">
        <Plus size={22} aria-hidden />
        <span className="btn__label">Organiser un match</span>
      </Link>
      {user ? (
        <Link to="/profile" className="side__me" aria-label={`Mon profil, ${user.display_name}`}>
          <Avatar name={user.display_name} uri={user.avatar_url} tone={user.accent} size={40} />
          <div className="grow">
            <b>{user.display_name}</b>
            <span>{user.city ?? 'Mon profil'}</span>
          </div>
        </Link>
      ) : null}
    </aside>
  );
}

function TabBar() {
  const badge = useBadge();
  return (
    <nav className="tabbar" aria-label="Onglets">
      {TABS.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}>
          <n.icon size={22} aria-hidden />
          {n.label}
          {n.badge ? <Count n={badge[n.badge]} /> : null}
        </NavLink>
      ))}
    </nav>
  );
}

function Rail() {
  const { pathname } = useLocation();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [friends, setFriends] = useState<Friends['friends'] | null>(null);
  // Rechargé à chaque changement de page : inscription à un match, ami ajouté…
  useEffect(() => {
    get<{ items: Match[] }>('/me/matches', { limit: 3 })
      .then((r) => setMatches(r.items.slice(0, 3)))
      .catch(() => undefined);
    get<Friends>('/me/friends')
      .then((r) => setFriends(r.friends))
      .catch(() => undefined);
  }, [pathname]);
  const around = friends?.filter((f) => f.presence && f.presence.state !== 'offline') ?? [];
  return (
    <aside className="rail" aria-label="En ce moment">
      <section className="card" style={{ padding: '14px 0' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, padding: '0 16px 6px' }}>Tes prochains matchs</h2>
        {matches && !matches.length ? <p className="sub" style={{ padding: '0 16px' }}>Aucun match prévu. Trouves-en un près de chez toi !</p> : null}
        {matches?.map((m) => (
          <Link key={m.id} to={`/match/${m.id}`} className="rail__row">
            <span className="rail__icon">
              <Trophy size={17} aria-hidden />
            </span>
            <span className="grow">
              <b className="ellipsis">{m.title ?? formatLabel(m.format)}</b>
              <span className="ellipsis">{`${whenLabel(m.starts_at)} · ${m.venue.name}`}</span>
            </span>
          </Link>
        ))}
        <Link to="/" className="link rail__more">
          Trouver un match
        </Link>
      </section>
      <section className="card" style={{ padding: '14px 0' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, padding: '0 16px 6px' }}>Amis en ligne</h2>
        {friends && !around.length ? <p className="sub" style={{ padding: '0 16px' }}>Personne pour l'instant.</p> : null}
        {around.slice(0, 6).map((f) => (
          <Link key={f.id} to={`/user/${f.id}`} className="rail__row">
            <span style={{ position: 'relative' }}>
              <Avatar name={f.display_name} uri={f.avatar_url} tone={f.accent} size={36} />
              <span style={{ position: 'absolute', right: -1, bottom: -1 }}>
                <PresenceDot p={f.presence} />
              </span>
            </span>
            <span className="grow">
              <b className="ellipsis">{f.display_name}</b>
              <span>{f.presence?.state === 'match' ? 'En match' : 'En ligne'}</span>
            </span>
          </Link>
        ))}
        <Link to="/friends" className="link rail__more">
          {friends?.length ? 'Tous mes amis' : 'Trouver des amis'}
        </Link>
      </section>
      <nav className="rail__links" aria-label="Informations">
        <Link to="/help">Aide</Link>
        <Link to="/cgu">Conditions</Link>
        <a href="/confidentialite/">Confidentialité</a>
        <Link to="/mentions">Mentions légales</Link>
        <a href="/decouvrir/">Découvrir Supercity</a>
        <span>© 2026 Supercity</span>
      </nav>
    </aside>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  // Nouvelle page : on repart du haut.
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <div className="shell">
      <Side />
      <main className="main" id="contenu">
        {/* Les pages se chargent à la demande : le menu reste affiché pendant ce temps. */}
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Rail />
      <TabBar />
    </div>
  );
}

/** Retour à la page précédente, ou à `fallback` si on est arrivé directement sur cette page (lien partagé). */
export function useBack(fallback = '/') {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

/** Page secondaire : barre de titre avec retour, puis le contenu. */
export function Page({ title, back = '/', right, children, narrow, footer }: { title: string; back?: string | false; right?: ReactNode; children: ReactNode; narrow?: boolean; footer?: ReactNode }) {
  const goBack = useBack(back || '/');
  useEffect(() => {
    document.title = `${title} · Supercity`;
  }, [title]);
  return (
    <>
      <header className="topbar">
        {back !== false ? (
          <button type="button" className="topbar__back" onClick={goBack} aria-label="Retour" title="Retour">
            <ArrowLeft size={22} />
          </button>
        ) : null}
        <h1>{title}</h1>
        {right}
      </header>
      <div className={`page${narrow ? ' page--narrow' : ''}`}>{children}</div>
      {footer ? <div className="actionbar">{footer}</div> : null}
    </>
  );
}

/** Onglet principal (Matchs, Fil…) : pas de barre de titre, le titre est dans la page. */
export function TabPage({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    document.title = title === 'Matchs' ? 'Supercity' : `${title} · Supercity`;
  }, [title]);
  return (
    <>
      <div className="page">{children}</div>
      {footer ? <div className="actionbar">{footer}</div> : null}
    </>
  );
}
