// Modération : publications signalées (garder, supprimer, suspendre l'auteur), gestion des joueurs, événements bonus, scores contestés, boutique.
import { Ban, Check, Flag, Lock, Search, Trash2, Trophy, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, del, get, Me, ModReport, ModUser, post, Role } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { Page } from '../ui/Layout';
import { GradeBadge, RoleBadge } from '../ui/grade';
import { ModDisputes, ModEvents, ModShop } from '../ui/mod';
import { Avatar, Button, Chips, Empty, ErrorText, Kicker, Loading, Success, useConfirm } from '../ui/ui';

const DURATIONS = [
  { value: 1, label: '1 jour' },
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
];
type Tab = 'reports' | 'users' | 'events' | 'disputes' | 'shop';

export default function Moderation() {
  const { user, setUser } = useAuth();
  const { ask, dialog } = useConfirm();
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<ModReport[] | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<ModUser[]>([]);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  // Montant tapé par l'admin pour chaque joueur (points de grade ou pièces, négatif pour reprendre).
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const admin = user?.site_role === 'admin';
  const staff = admin || user?.site_role === 'moderator';

  const loadReports = useCallback(async () => {
    try {
      setReports((await get<{ items: ModReport[] }>('/mod/reports')).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
      setReports([]);
    }
  }, []);
  useEffect(() => {
    if (staff) loadReports();
  }, [staff, loadReports]);

  const search = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) return setFound([]);
    try {
      setFound((await get<{ items: ModUser[] }>('/mod/users', { q: text.trim() })).items);
    } catch {
      setFound([]);
    }
  };

  // Lance une action, affiche le résultat, puis recharge.
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setError('');
    setMsg('');
    try {
      await fn();
      setMsg(done);
      await loadReports();
      if (q.trim().length >= 2) search(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    }
  };

  // Admin : donner ou reprendre des points de grade ou des pièces, à n'importe qui (soi compris).
  const grant = (u: ModUser, what: 'points' | 'coins') => {
    const n = Number(amounts[u.id]);
    const label = what === 'points' ? `point${Math.abs(n) > 1 ? 's' : ''} de grade` : `pièce${Math.abs(n) > 1 ? 's' : ''}`;
    return act(
      async () => {
        await post(`/admin/users/${u.id}/${what}`, { amount: n });
        setAmounts({ ...amounts, [u.id]: '' });
        if (u.id === user?.id) setUser(await get<Me>('/me'));
      },
      n > 0 ? `${n} ${label} pour ${u.display_name}.` : `${-n} ${label} repris à ${u.display_name}.`
    );
  };

  if (!user || !staff)
    return (
      <Page title="Modération">
        <Empty icon={Lock} title="Réservé à la modération" />
      </Page>
    );

  return (
    <Page title={admin ? 'Administration' : 'Modération'} back="/settings">
      <Chips
        label="Rubrique"
        options={[
          { value: 'reports', label: `Signalements${reports?.length ? ` (${reports.length})` : ''}` },
          { value: 'users', label: 'Joueurs' },
          { value: 'events', label: 'Événements bonus' },
          { value: 'disputes', label: 'Scores contestés' },
          { value: 'shop', label: 'Boutique' },
        ]}
        value={tab}
        onChange={(v) => {
          if (!v) return;
          setTab(v as Tab);
          setMsg('');
          setError('');
        }}
      />
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>

      {tab === 'events' ? <ModEvents act={act} /> : null}
      {tab === 'disputes' ? <ModDisputes /> : null}
      {tab === 'shop' ? <ModShop act={act} /> : null}

      {tab === 'reports' ? (
        reports === null ? (
          <Loading />
        ) : reports.length === 0 ? (
          <Empty icon={Check} title="Rien à modérer" text="Aucune publication signalée pour le moment." />
        ) : (
          reports.map((r) => (
            <article key={r.post.id} className="card stack" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <Avatar name={r.post.author.display_name} uri={r.post.author.avatar_url} tone={r.post.author.accent} size={38} />
                <div className="grow">
                  <Link to={`/user/${r.post.author.id}`} className="mod-name">
                    {r.post.author.display_name}
                  </Link>
                  <span className="sub" style={{ display: 'block', fontSize: 12.5 }}>
                    {timeAgo(r.post.created_at)}
                  </span>
                </div>
                <span className="mod-count" style={r.hidden ? { background: 'var(--danger)' } : undefined} title={`${r.reports} signalement${r.reports > 1 ? 's' : ''}`}>
                  <Flag size={12} aria-hidden />
                  {r.reports}
                </span>
              </div>
              {r.post.body ? <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{r.post.body}</p> : null}
              {r.post.image_url ? <img src={r.post.image_url} alt="" className="mod-image" loading="lazy" /> : null}
              <span className="sub" style={{ fontSize: 12.5 }}>
                {r.hidden ? 'Masquée pour tous. ' : ''}
                {r.reasons.length ? `Motifs : ${r.reasons.join(', ')}` : 'Aucun motif donné.'}
              </span>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button variant="ghost" small icon={Check} onClick={() => act(() => post(`/mod/posts/${r.post.id}/keep`), 'Publication gardée, signalements effacés.')}>
                  Garder
                </Button>
                <Button
                  variant="danger"
                  small
                  icon={Trash2}
                  onClick={async () => (await ask('Supprimer la publication ?', 'Elle disparaîtra pour tout le monde.', 'Supprimer')) && act(() => del(`/posts/${r.post.id}`), 'Publication supprimée.')}
                >
                  Supprimer
                </Button>
                <Button
                  variant="dark"
                  small
                  icon={Ban}
                  onClick={async () =>
                    (await ask(`Suspendre ${r.post.author.display_name} ?`, `Pendant ${days} jour${days > 1 ? 's' : ''}, il ne pourra plus publier, commenter ni organiser.`, 'Suspendre')) &&
                    act(() => post(`/mod/users/${r.post.author.id}/suspend`, { days, reason: r.reasons[0] ?? 'Publication signalée' }), `${r.post.author.display_name} est suspendu ${days} jour${days > 1 ? 's' : ''}.`)
                  }
                >
                  {`Suspendre ${days} j`}
                </Button>
              </div>
            </article>
          ))
        )
      ) : null}

      {tab === 'users' ? (
        <>
          <div className="field__box">
            <Search size={18} aria-hidden style={{ color: 'var(--dim)' }} />
            <input type="search" value={q} onChange={(e) => search(e.target.value)} placeholder="Pseudo ou e-mail" aria-label="Chercher un joueur" autoFocus />
          </div>
          {found.map((u) => (
            <article key={u.id} className="card stack" style={{ gap: 10 }}>
              <Link to={`/user/${u.id}`} className="row" style={{ gap: 10, textDecoration: 'none', color: 'inherit' }}>
                <Avatar name={u.display_name} uri={u.avatar_url} tone={u.accent} size={40} />
                <div className="stack grow" style={{ gap: 3 }}>
                  <b>{u.display_name}</b>
                  <span className="sub" style={{ fontSize: 12.5 }}>
                    {u.email}
                  </span>
                  <div className="row" style={{ gap: 6 }}>
                    <GradeBadge grade={u.grade} />
                    <RoleBadge role={u.site_role} />
                  </div>
                </div>
              </Link>
              {u.id !== user.id ? (
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <Button variant="dark" small icon={Ban} onClick={() => act(() => post(`/mod/users/${u.id}/suspend`, { days }), `${u.display_name} est suspendu.`)}>
                    {`Suspendre ${days} j`}
                  </Button>
                  <Button variant="ghost" small onClick={() => act(() => del(`/mod/users/${u.id}/suspend`), `Suspension levée pour ${u.display_name}.`)}>
                    Lever la suspension
                  </Button>
                </div>
              ) : null}
              {admin && u.id !== user.id ? (
                <Chips
                  label="Rôle"
                  options={[
                    { value: 'user', label: 'Joueur' },
                    { value: 'moderator', label: 'Modérateur' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  value={u.site_role ?? 'user'}
                  onChange={(v) =>
                    v && v !== u.site_role && act(() => post(`/admin/users/${u.id}/role`, { role: v as Role }), `${u.display_name} est maintenant ${v === 'admin' ? 'admin' : v === 'moderator' ? 'modérateur' : 'joueur'}.`)
                  }
                />
              ) : null}
              {admin ? (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="sub" style={{ fontSize: 12.5 }}>
                    {u.grade?.points ?? 0} point{(u.grade?.points ?? 0) > 1 ? 's' : ''} de grade. Mets un nombre négatif pour en reprendre.
                  </span>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <div className="field__box" style={{ width: 110 }}>
                      <input
                        value={amounts[u.id] ?? ''}
                        onChange={(e) => setAmounts({ ...amounts, [u.id]: e.target.value.replace(/[^0-9-]/g, '') })}
                        placeholder="Ex. 50"
                        inputMode="numeric"
                        aria-label={`Montant pour ${u.display_name}`}
                      />
                    </div>
                    <Button variant="ghost" small icon={Trophy} disabled={!Number(amounts[u.id])} onClick={() => grant(u, 'points')}>
                      Points de grade
                    </Button>
                    <Button variant="ghost" small icon={Wallet} disabled={!Number(amounts[u.id])} onClick={() => grant(u, 'coins')}>
                      Pièces
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {q.trim().length >= 2 && !found.length ? <p className="sub">Aucun joueur trouvé.</p> : null}
        </>
      ) : null}

      {tab === 'reports' || tab === 'users' ? (
        <>
          <Kicker>Durée des suspensions</Kicker>
          <Chips label="Durée des suspensions" options={DURATIONS} value={days} onChange={(v) => v && setDays(v)} />
        </>
      ) : null}
      {dialog}
    </Page>
  );
}
