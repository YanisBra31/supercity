// Noter les joueurs d'un match : des étoiles pour chacun et, si on veut, son point fort. Leurs cartes FUT en tiennent compte.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { celebrate } from '../../components/Celebration';
import { CARD_STATS, Stars } from '../../components/PlayerCard';
import { Avatar, Button, Card, Chip, colors, Empty, ErrorText, font, Loading, PageHeader, s, Screen } from '../../components/ui';
import { ApiError, CardStat, get, post, RatingPlayer } from '../../lib/api';

type Vote = { stars: number | null; best: CardStat | null };

export default function RatePlayers() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const set = (pid: number, v: Partial<Vote>) => setVotes((prev) => ({ ...prev, [pid]: { ...prev[pid], ...v } }));
  const given = Object.entries(votes).filter(([, v]) => v.stars !== null);

  const send = async () => {
    setError('');
    setSaving(true);
    try {
      await post(`/matches/${id}/ratings`, { ratings: given.map(([pid, v]) => ({ user_id: Number(pid), stars: v.stars, best: v.best })) });
      celebrate({ title: 'Merci pour tes notes !', text: 'Les cartes des joueurs sont à jour.', icon: 'star' });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Envoi impossible.');
      setSaving(false);
    }
  };

  if (!players) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  return (
    <Screen
      footer={
        players.length ? (
          <>
            <ErrorText>{error}</ErrorText>
            <Button
              title={given.length ? `Envoyer ${given.length} note${given.length > 1 ? 's' : ''}` : 'Touche les étoiles pour noter'}
              icon="send"
              disabled={!given.length}
              loading={saving}
              onPress={send}
            />
          </>
        ) : undefined
      }
    >
      <PageHeader kicker="Après le match" title="Comment ils ont joué ?" sub="Tes notes restent anonymes. Le point fort est facultatif." />
      {players.length === 0 ? <Empty icon="people-outline" title="Personne à noter" text="Tu étais le seul inscrit à ce match." /> : null}
      {players.map((p) => {
        const v = votes[p.id] ?? { stars: null, best: null };
        return (
          <Card key={p.id} style={{ gap: 10 }}>
            <View style={[s.row, { gap: 12 }]}>
              <Avatar name={p.display_name} uri={p.avatar_url} size={44} />
              <Text style={{ ...font.bold, fontSize: 15, color: colors.ink, flex: 1 }} numberOfLines={1}>
                {p.display_name}
              </Text>
              <Stars n={v.stars ?? 0} size={26} color={colors.orange2} onPick={(n) => set(p.id, { stars: n })} />
            </View>
            {v.stars !== null ? (
              <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
                {CARD_STATS.map((c) => (
                  <Chip key={c.key} label={c.label} on={v.best === c.key} onPress={() => set(p.id, { best: v.best === c.key ? null : c.key })} />
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
