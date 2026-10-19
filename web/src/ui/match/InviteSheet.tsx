// Inviter des amis à un match : on coche, on envoie. Chaque ami ne reçoit qu'une invitation par match.
import { CheckCircle2, Circle, Send, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, get, Invitable, post } from '../../lib/api';
import { presenceLabel } from '../../lib/presence';
import { PresenceDot } from '../social';
import { Avatar, Button, ButtonLink, ErrorText, Loading, Sheet } from '../ui';

const STATE_LABEL = { in: 'Déjà dans le match', invited: 'Déjà invité' } as const;

export function InviteSheet({ matchId, open, onClose, onSent }: { matchId: number; open: boolean; onClose: () => void; onSent: (n: number) => void }) {
  const [items, setItems] = useState<Invitable[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setItems(null);
    setPicked(new Set());
    setError('');
    get<{ items: Invitable[] }>(`/matches/${matchId}/invitable`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Liste d'amis indisponible."));
  }, [open, matchId]);

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await post<{ invited: number }>(`/matches/${matchId}/invite`, { user_ids: [...picked] });
      onSent(r.invited);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invitation impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const available = items?.filter((i) => i.invite === 'available') ?? [];
  const allPicked = available.length > 0 && available.every((i) => picked.has(i.id));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Inviter des amis"
      right={
        available.length > 1 ? (
          <button type="button" className="link" onClick={() => setPicked(allPicked ? new Set() : new Set(available.map((i) => i.id)))}>
            {allPicked ? 'Aucun' : 'Tous'}
          </button>
        ) : null
      }
      footer={
        <>
          <ErrorText>{error}</ErrorText>
          {items?.length ? (
            <Button icon={Send} block disabled={!picked.size} loading={busy} onClick={send}>
              {picked.size ? `Inviter ${picked.size} ami${picked.size > 1 ? 's' : ''}` : 'Choisis tes amis'}
            </Button>
          ) : null}
          <Button variant="ghost" block onClick={onClose} style={{ borderColor: 'transparent' }}>
            Fermer
          </Button>
        </>
      }
    >
      {!items ? (
        error ? null : <Loading />
      ) : !items.length ? (
        <div className="stack">
          <p className="sub">Ajoute d'abord des amis pour pouvoir les inviter.</p>
          <ButtonLink to="/friends" icon={UserPlus} variant="dark" onClick={onClose}>
            Trouver des amis
          </ButtonLink>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {items.map((u) => {
            const on = picked.has(u.id);
            const free = u.invite === 'available';
            return (
              <label key={u.id} className={`invite-row${on ? ' is-on' : ''}${free ? '' : ' is-off'}`}>
                <input type="checkbox" className="sr" checked={on} disabled={!free} onChange={() => toggle(u.id)} />
                <span style={{ position: 'relative' }}>
                  <Avatar name={u.display_name} uri={u.avatar_url} tone={u.accent} size={40} />
                  <span style={{ position: 'absolute', right: 0, bottom: 0 }}>
                    <PresenceDot p={u.presence} size={12} />
                  </span>
                </span>
                <span className="grow">
                  <b className="ellipsis" style={{ display: 'block' }}>
                    {u.display_name}
                  </b>
                  <span className="sub ellipsis" style={{ display: 'block', fontSize: 12.5 }}>
                    {free ? (u.presence ? presenceLabel(u.presence) : (u.city ?? ' ')) : STATE_LABEL[u.invite as 'in' | 'invited']}
                  </span>
                </span>
                {free ? on ? <CheckCircle2 size={26} color="var(--orange-2)" aria-hidden /> : <Circle size={26} color="var(--line)" aria-hidden /> : null}
              </label>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
