// Noter les joueurs d'un match : des étoiles pour chacun et, si on veut, son point fort. Leurs cartes FUT en tiennent compte.
import { Send, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError, CardStat, get, post, RatingPlayer } from '../lib/api';
import { celebrate } from '../ui/celebrate';
import { Page, useBack } from '../ui/Layout';
import { Avatar, Button, Card, Chips, Empty, ErrorText, Loading, PageHeader } from '../ui/ui';

const CARD_STATS: { value: CardStat; label: string }[] = [
  { value: 'pac', label: 'Vitesse' },
  { value: 'sho', label: 'Tir' },
  { value: 'pas', label: 'Passe' },
  { value: 'dri', label: 'Dribble' },
  { value: 'def', label: 'Défense' },
  { value: 'phy', label: 'Physique' },
];

type Vote = { stars: number | null; best: CardStat | null };

/** Cinq étoiles cliquables (flèches gauche/droite au clavier). */
function StarPicker({ value, onPick, name }: { value: number; onPick: (n: number) => void; name: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="stars" role="radiogroup" aria-label={`Note de ${name}`} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
          tabIndex={value ? (value === i ? 0 : -1) : i === 1 ? 0 : -1}
          onMouseEnter={() => setHover(i)}
          onClick={() => onPick(i)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onPick(Math.min(5, (value || 0) + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onPick(Math.max(1, (value || 2) - 1));
            }
          }}
        >
          <Star size={26} fill={i <= shown ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function Rate() {
  const { id } = useParams<{ id: string }>();
  const back = useBack(`/match/${id}`);
  const [players, setPlayers] = useState<RatingPlayer[] | null>(null);
  const [votes, setVotes] = useState<Record<number, Vote>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get<{ players: RatingPlayer[] }>(`/matches/${id}/ratings`)
      .then((r) => {
        setPlayers(r.players);
        setVotes(Object.fromEntries(r.players.map((p) => [p.id, { stars: p.stars, best: p.best }])));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Notes indisponibles.'));
  }, [id]);

  const set = (pid: number, v: Partial<Vote>) => setVotes((prev) => ({ ...prev, [pid]: { ...(prev[pid] ?? { stars: null, best: null }), ...v } }));
  const given = Object.entries(votes).filter(([, v]) => v.stars !== null);

  const send = async () => {
    setError('');
    setSaving(true);
    try {
      await post(`/matches/${id}/ratings`, { ratings: given.map(([pid, v]) => ({ user_id: Number(pid), stars: v.stars, best: v.best })) });
      celebrate({ title: 'Merci pour tes notes !', text: 'Les cartes des joueurs sont à jour.' });
      back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Envoi impossible.');
      setSaving(false);
    }
  };

  if (!players)
    return (
      <Page title="Noter les joueurs" back={`/match/${id}`}>
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

  return (
    <Page
      title="Noter les joueurs"
      back={`/match/${id}`}
      footer={
        players.length ? (
          <>
            <ErrorText>{error}</ErrorText>
            <Button icon={Send} disabled={!given.length} loading={saving} onClick={send} block>
              {given.length ? `Envoyer ${given.length} note${given.length > 1 ? 's' : ''}` : 'Clique sur les étoiles pour noter'}
            </Button>
          </>
        ) : undefined
      }
    >
      <PageHeader kicker="Après le match" title="Comment ils ont joué ?" sub="Tes notes restent anonymes. Le point fort est facultatif." />
      {players.length === 0 ? <Empty icon={Users} title="Personne à noter" text="Tu étais le seul inscrit à ce match." /> : null}
      {players.map((p) => {
        const v = votes[p.id] ?? { stars: null, best: null };
        return (
          <Card key={p.id} className="stack rate-card">
            <div className="row rate-card__head" style={{ gap: 12 }}>
              <Avatar name={p.display_name} uri={p.avatar_url} tone={p.accent} size={44} />
              <b className="grow ellipsis" style={{ fontSize: 15 }}>
                {p.display_name}
              </b>
              <StarPicker value={v.stars ?? 0} name={p.display_name} onPick={(n) => set(p.id, { stars: n })} />
            </div>
            {v.stars !== null ? <Chips label={`Point fort de ${p.display_name}`} options={CARD_STATS} value={v.best} onChange={(b) => set(p.id, { best: b })} allowEmpty /> : null}
          </Card>
        );
      })}
    </Page>
  );
}
