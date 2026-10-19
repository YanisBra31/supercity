// Mes amis : demandes reçues, amis triés par statut (en match, en ligne, hors ligne), recherche pour en ajouter.
import { Check, Clock, Search, Share2, UserPlus, Users, Volleyball, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, Friendship, Friends as FriendsData, get, PublicUser } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { shareMessage, webUrl } from '../lib/links';
import { TabPage } from '../ui/Layout';
import { FriendRow, sendFriend } from '../ui/social';
import { Button, Empty, ErrorText, IconButton, Kicker, Loading, PageHeader, Pill, useToast } from '../ui/ui';

type Found = PublicUser & { friendship: Friendship };

export default function Friends() {
  const { user } = useAuth();
  const { show, toast } = useToast();
  const [data, setData] = useState<FriendsData | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await get<FriendsData>('/me/friends'));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Liste d'amis indisponible.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Recherche au fil de la frappe, à partir de 2 lettres.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setFound(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      get<{ items: Found[] }>('/users', { q: term })
        .then((r) => setFound(r.items))
        .catch(() => setFound([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (id: number, add: boolean) => {
    setError('');
    setBusy(id);
    try {
      const f = await sendFriend(id, add);
      setFound((prev) => prev?.map((u) => (u.id === id ? { ...u, friendship: f } : u)) ?? null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!user) return;
    const r = await shareMessage(`Ajoute-moi sur Supercity, je suis ${user.display_name} : ${webUrl(`user/${user.id}`)}`);
    if (r === 'copied') show('Lien copié, colle-le à ton pote.');
  };

  const searchAction = (u: Found) => {
    switch (u.friendship) {
      case 'friends':
        return <Pill text="Ami" tone="green" icon={Check} />;
      case 'outgoing':
        return <Pill text="Envoyée" tone="grey" icon={Clock} />;
      case 'incoming':
        return (
          <Button small icon={Check} loading={busy === u.id} onClick={() => act(u.id, true)}>
            Accepter
          </Button>
        );
      default:
        return (
          <Button small icon={UserPlus} loading={busy === u.id} onClick={() => act(u.id, true)}>
            Ajouter
          </Button>
        );
    }
  };

  const friends = data?.friends ?? [];
  const inMatch = friends.filter((f) => f.presence?.state === 'match');
  const online = friends.filter((f) => f.presence?.state === 'online');
  const rest = friends.filter((f) => !f.presence || f.presence.state === 'offline');
  const groups: [string, typeof friends][] = [
    [`En match · ${inMatch.length}`, inMatch],
    [`En ligne · ${online.length}`, online],
    [inMatch.length || online.length ? `Hors ligne · ${rest.length}` : `Mes amis · ${rest.length}`, rest],
  ];

  return (
    <TabPage title="Amis">
      <PageHeader kicker="Ta bande" title="Amis" sub="Vois qui joue, et ajoute tes potes par leur pseudo." />
      <label className="searchbox">
        <Search size={18} aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ajouter un ami : tape son pseudo" aria-label="Chercher un joueur" autoComplete="off" />
        {searching ? <span className="spinner" aria-label="Recherche…" /> : null}
      </label>
      <ErrorText>{error}</ErrorText>

      {found ? (
        <>
          <Kicker>Résultats</Kicker>
          {found.length ? found.map((u) => <FriendRow key={u.id} u={u} sub={u.city ?? undefined} right={searchAction(u)} />) : <p className="sub">Aucun joueur ne s'appelle comme ça.</p>}
        </>
      ) : !data ? (
        error ? null : <Loading />
      ) : (
        <>
          {data.incoming.length ? <Kicker>{`Demandes reçues · ${data.incoming.length}`}</Kicker> : null}
          {data.incoming.map((u) => (
            <FriendRow
              key={u.id}
              u={u}
              sub={timeAgo(u.requested_at)}
              right={
                <div className="row" style={{ gap: 6 }}>
                  <Button small loading={busy === u.id} onClick={() => act(u.id, true)}>
                    Accepter
                  </Button>
                  <IconButton icon={X} label={`Refuser ${u.display_name}`} onClick={() => act(u.id, false)} />
                </div>
              }
            />
          ))}

          {!friends.length ? (
            <Empty icon={Users} title="Pas encore d'amis" text="Cherche tes potes par leur pseudo, ou ajoute-les depuis leur profil après un match. Tu verras quand ils jouent." />
          ) : (
            groups.map(([title, list]) =>
              list.length ? (
                <section key={title} className="stack">
                  <Kicker>{title}</Kicker>
                  {list.map((f) => (
                    <FriendRow key={f.id} u={f} presence={f.presence} right={f.presence?.match ? <IconButton icon={Volleyball} label="Voir son match" to={`/match/${f.presence.match.id}`} /> : undefined} />
                  ))}
                </section>
              ) : null
            )
          )}

          {data.outgoing.length ? <Kicker>{`Demandes envoyées · ${data.outgoing.length}`}</Kicker> : null}
          {data.outgoing.map((u) => (
            <FriendRow
              key={u.id}
              u={u}
              sub={`En attente · ${timeAgo(u.requested_at)}`}
              right={
                <Button small variant="ghost" loading={busy === u.id} onClick={() => act(u.id, false)}>
                  Annuler
                </Button>
              }
            />
          ))}
          <Button icon={Share2} variant="ghost" onClick={share}>
            Inviter un pote
          </Button>
          {friends.length ? (
            <p className="sub" style={{ textAlign: 'center', fontSize: 12.5 }}>
              Tes amis voient aussi ton statut. Tu peux le cacher dans les Réglages.
            </p>
          ) : null}
        </>
      )}
      {toast}
    </TabPage>
  );
}
