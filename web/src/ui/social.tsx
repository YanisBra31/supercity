// Amis : pastille de statut, statut en toutes lettres, ligne d'ami, bouton d'amitié.
import { Check, Clock, Trophy, UserPlus, Users } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, del, Friendship, post, Presence, PublicUser } from '../lib/api';
import { refreshBadge } from '../lib/badge';
import { nextMatchLabel, presenceLabel } from '../lib/presence';
import { Avatar, Button, ErrorText, useConfirm } from './ui';

export const PRESENCE_COLORS = { match: 'var(--orange-2)', online: 'var(--success)', offline: 'var(--dim)' } as const;

export async function sendFriend(id: number, add: boolean): Promise<Friendship> {
  const r = add ? await post<{ friendship: Friendship }>(`/users/${id}/friend`) : await del<{ friendship: Friendship }>(`/users/${id}/friend`);
  refreshBadge();
  return r.friendship;
}

/** Pastille : orange en match, vert en ligne, gris sinon. */
export function PresenceDot({ p, size = 12 }: { p: Presence | null | undefined; size?: number }) {
  if (!p) return null;
  return <span style={{ display: 'block', width: size, height: size, borderRadius: '50%', background: PRESENCE_COLORS[p.state], border: '2px solid var(--card)' }} title={presenceLabel(p)} />;
}

/** Statut en toutes lettres, avec le prochain match en dessous. */
export function PresenceText({ p }: { p: Presence }) {
  const next = p.state !== 'match' ? nextMatchLabel(p) : null;
  return (
    <span style={{ display: 'block', minWidth: 0 }}>
      <span className="row" style={{ gap: 6, color: p.state === 'offline' ? 'var(--dim)' : PRESENCE_COLORS[p.state], fontWeight: 600, fontSize: 13 }}>
        {p.state === 'match' ? <Trophy size={13} aria-hidden /> : null}
        <span className="ellipsis">{presenceLabel(p)}</span>
      </span>
      {next ? <span className="ellipsis" style={{ display: 'block', fontSize: 12.5, color: 'var(--dim)' }}>{next}</span> : null}
    </span>
  );
}

/** Ligne d'un joueur dans les listes d'amis, de demandes ou de recherche. */
export function FriendRow({ u, presence, sub, right }: { u: PublicUser; presence?: Presence | null; sub?: string; right?: ReactNode }) {
  return (
    <div className="card row" style={{ padding: 12, gap: 12 }}>
      <Link to={`/user/${u.id}`} className="row grow" style={{ gap: 12, textDecoration: 'none' }}>
        <span style={{ position: 'relative' }}>
          <Avatar name={u.display_name} uri={u.avatar_url} tone={u.accent} size={48} />
          <span style={{ position: 'absolute', right: 0, bottom: 0 }}>
            <PresenceDot p={presence} size={14} />
          </span>
        </span>
        <span className="grow">
          <b className="ellipsis" style={{ display: 'block' }}>{u.display_name}</b>
          {presence ? <PresenceText p={presence} /> : sub ? <span className="sub" style={{ fontSize: 12.5 }}>{sub}</span> : null}
        </span>
      </Link>
      {right}
    </div>
  );
}

/** Bouton d'amitié sur le profil d'un autre joueur, selon où vous en êtes. */
export function FriendButton({ userId, name, state, onChange }: { userId: number; name: string; state: Friendship; onChange: (f: Friendship) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { ask, dialog } = useConfirm();
  const run = async (add: boolean) => {
    setBusy(true);
    setError('');
    try {
      onChange(await sendFriend(userId, add));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      {state === 'none' ? (
        <Button icon={UserPlus} onClick={() => run(true)} loading={busy}>
          Ajouter en ami
        </Button>
      ) : null}
      {state === 'outgoing' ? (
        <Button icon={Clock} variant="ghost" loading={busy} onClick={async () => (await ask('Annuler ta demande ?', `${name} ne verra plus ta demande d'ami.`, 'Annuler la demande')) && run(false)}>
          Demande envoyée
        </Button>
      ) : null}
      {state === 'incoming' ? (
        <div className="row">
          <Button icon={Check} onClick={() => run(true)} loading={busy} className="grow">
            Accepter
          </Button>
          <Button variant="ghost" onClick={() => run(false)} disabled={busy} className="grow">
            Refuser
          </Button>
        </div>
      ) : null}
      {state === 'friends' ? (
        <Button icon={Users} variant="dark" loading={busy} onClick={async () => (await ask(`Retirer ${name} de tes amis ?`, "Vous ne verrez plus le statut l'un de l'autre.", 'Retirer')) && run(false)}>
          Vous êtes amis
        </Button>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {dialog}
    </div>
  );
}
