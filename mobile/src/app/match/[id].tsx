// Détail d'un match : infos, joueurs, inscription.
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Share, Text, View } from 'react-native';
import { statusPill } from '../../components/MatchCard';
import { Gradient, Hero } from '../../components/brand';
import { Avatar, Button, Card, colors, ErrorText, Label, Loading, Pill, s, Screen, font } from '../../components/ui';
import { ApiError, del, get, Match, post, Team } from '../../lib/api';
import { distanceLabel, formatLabel, formatShort, levelLabel, POSITIONS, surfaceLabel, whenLabel } from '../../lib/format';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Non', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Oui', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [m, setM] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setM(await get<Match>(`/matches/${id}`));
      setTeams((await get<{ items: Team[] }>('/me/teams')).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Match introuvable.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<Match>) => {
    setBusy(true);
    setError('');
    try {
      setM(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!m) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  const closed = m.status === 'cancelled' || m.status === 'played';
  const inMatch = m.my_status === 'registered' || m.my_status === 'waitlist';
  const myTeamIds = new Set(teams.map((t) => t.id));
  const teamForMatch = [m.home_team, m.away_team].find((t) => t && myTeamIds.has(t.id));
  const registered = m.players?.filter((p) => p.status === 'registered') ?? [];
  const waiting = m.players?.filter((p) => p.status === 'waitlist') ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: m.venue.name }} />
      <Hero kicker={`${formatLabel(m.format)} · ${formatShort(m.format)}`} title={whenLabel(m.starts_at)} sub={`${m.duration_min} min · ${levelLabel(m.level)} · organisé par ${m.organizer.display_name}`}>
        <View style={{ marginTop: 8 }}>{statusPill(m)}</View>
        <View style={{ marginTop: 12, gap: 6 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(31,26,23,.25)', overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(1, m.players_count / m.max_players) * 100}%`, height: 8, backgroundColor: colors.night }} />
          </View>
          <Text style={{ ...font.semibold, fontSize: 12, color: colors.chalk }}>
            {m.players_count}/{m.max_players} joueurs{m.spots_left > 0 ? ` · ${m.spots_left} place${m.spots_left > 1 ? 's' : ''} libre${m.spots_left > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </Hero>

      {m.home_team || m.away_team ? (
        <Gradient tone="night" style={{ borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Avatar name={m.home_team?.name ?? '?'} uri={m.home_team?.logo_url} size={46} />
            <Text style={{ ...font.extrabold, fontSize: 14, color: colors.chalk, textAlign: 'center' }}>{m.home_team?.name ?? 'Joueurs libres'}</Text>
          </View>
          <Text style={{ ...font.black, fontSize: 22, color: colors.orange1 }}>VS</Text>
          <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Avatar name={m.away_team?.name ?? '?'} uri={m.away_team?.logo_url} size={46} tone="night" />
            <Text style={{ ...font.extrabold, fontSize: 14, color: colors.chalk, textAlign: 'center' }}>{m.away_team?.name ?? 'Adversaire à trouver'}</Text>
          </View>
        </Gradient>
      ) : null}

      <Card>
        <View style={s.row}>
          <Ionicons name="location" size={18} color={colors.orange2} />
          <Text style={{ ...font.bold, fontSize: 16, flex: 1, color: colors.ink }}>{m.venue.name}</Text>
        </View>
        <Text style={s.sub}>{m.venue.address}</Text>
        <Text style={s.sub}>
          {surfaceLabel(m.venue.surface)}
          {m.venue.covered ? ' · couvert' : ''}
          {m.venue.distance_km !== null ? ` · ${distanceLabel(m.venue.distance_km)}` : ''}
        </Text>
      </Card>

      {m.description ? <Text style={[s.sub, { color: colors.ink }]}>{m.description}</Text> : null}

      <ErrorText>{error}</ErrorText>
      {!closed && !inMatch ? (
        <Button
          title={m.spots_left > 0 ? 'Je joue' : "Rejoindre la liste d'attente"}
          icon="football"
          loading={busy}
          onPress={() => act(() => post<Match>(`/matches/${m.id}/join`, teamForMatch ? { team_id: teamForMatch.id } : {}))}
        />
      ) : null}
      {!closed && inMatch ? (
        <Button
          title="Me désister"
          variant="ghost"
          loading={busy}
          onPress={async () => {
            if (await confirm('Te désister ?', 'Ta place ira au premier joueur en liste d\'attente.')) act(() => del<Match>(`/matches/${m.id}/join`));
          }}
        />
      ) : null}
      <Button
        title="Partager le match"
        variant="ghost"
        icon="share-outline"
        onPress={() =>
          Share.share({
            message: `${formatLabel(m.format)} ${whenLabel(m.starts_at)} à ${m.venue.name}. Viens jouer sur Supercity : supercity://match/${m.id}`,
          })
        }
      />

      <View style={{ gap: 8 }}>
        <Label>
          Joueurs {m.players_count}/{m.max_players}
        </Label>
        {registered.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/user/${p.id}`)} style={[s.row, { paddingVertical: 4 }]}>
            <Avatar name={p.display_name} uri={p.avatar_url} size={38} tone={p.accent} />
            <Text style={{ flex: 1, ...font.semibold, color: colors.ink }}>{p.display_name}</Text>
            {p.position ? <Pill text={POSITIONS.find((x) => x.value === p.position)?.label ?? ''} tone="grey" /> : null}
          </Pressable>
        ))}
        {waiting.length ? <Label>Liste d'attente</Label> : null}
        {waiting.map((p, i) => (
          <Text key={p.id} style={s.sub}>
            {i + 1}. {p.display_name}
          </Text>
        ))}
      </View>

      {m.is_organizer && !closed ? (
        <Button
          title="Annuler le match"
          variant="danger"
          onPress={async () => {
            if (await confirm('Annuler le match ?', 'Les joueurs inscrits verront le match comme annulé.')) act(() => post<Match>(`/matches/${m.id}/cancel`));
          }}
        />
      ) : null}
    </Screen>
  );
}
