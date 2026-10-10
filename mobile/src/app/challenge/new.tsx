// Lancer un défi à une équipe : sur un de nos matchs sans adversaire, ou sur un nouveau créneau.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gradient } from '../../components/brand';
import { DateTimePicker, VenuePicker } from '../../components/pickers';
import { Button, Chip, Chips, colors, Empty, ErrorText, Field, font, Kicker, Label, Loading, s, Screen, TeamCrest } from '../../components/ui';
import { ApiError, Challenge, Format, get, Match, post, Team, Venue } from '../../lib/api';
import { FORMATS, formatLabel, whenLabel } from '../../lib/format';

export default function NewChallenge() {
  const params = useLocalSearchParams<{ to: string; match?: string }>();
  const [target, setTarget] = useState<Team | null>(null);
  const [mine, setMine] = useState<Team[] | null>(null);
  const [fromId, setFromId] = useState<number | null>(null);
  const [open, setOpen] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState<number | null>(params.match ? Number(params.match) : null);
  const [format, setFormat] = useState<Format>('city5');
  const [when, setWhen] = useState<Date | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const onVenue = useCallback((v: Venue | null) => setVenue(v), []);

  useEffect(() => {
    get<Team>(`/teams/${params.to}`).then(setTarget).catch(() => setError('Équipe introuvable.'));
    get<{ items: Team[] }>('/me/teams').then((r) => {
      const caps = r.items.filter((t) => t.my_role === 'captain' && String(t.id) !== params.to);
      setMine(caps);
      if (caps.length) setFromId(caps[0].id);
    });
  }, [params.to]);

  // Nos matchs à venir sans adversaire : on peut y inviter l'équipe.
  useEffect(() => {
    if (!fromId) return;
    get<{ items: Match[] }>('/me/matches')
      .then((r) => setOpen(r.items.filter((m) => m.home_team?.id === fromId && !m.away_team && m.status !== 'cancelled' && m.status !== 'played')))
      .catch(() => setOpen([]));
  }, [fromId]);

  if (!target || mine === null) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;
  if (!mine.length) {
    return (
      <Screen>
        <Empty icon="shield-outline" title="Il faut être capitaine" text="Seul le capitaine d'une équipe peut lancer un défi. Crée ton équipe dans l'onglet Équipes." />
      </Screen>
    );
  }

  const submit = async () => {
    setError('');
    if (!matchId && (!when || !venue)) return setError('Choisis le jour, l’heure et le terrain du match.');
    setLoading(true);
    try {
      await post<Challenge>('/challenges', {
        from_team_id: fromId,
        to_team_id: target.id,
        message: message.trim() || null,
        ...(matchId ? { match_id: matchId } : { format, starts_at: when!.toISOString(), venue_id: venue!.id }),
      });
      router.replace('/teams');
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Envoi du défi impossible.');
    } finally {
      setLoading(false);
    }
  };

  const from = mine.find((t) => t.id === fromId)!;
  return (
    <Screen>
      <Gradient tone="night" style={{ borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <TeamCrest name={from.name} logo={from.logo_url} primary={from.color_primary} secondary={from.color_secondary} size={58} />
          <Text style={{ ...font.extrabold, color: colors.chalk, textAlign: 'center' }}>{from.name}</Text>
        </View>
        <Text style={{ ...font.black, fontSize: 26, color: colors.orange1 }}>VS</Text>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <TeamCrest name={target.name} logo={target.logo_url} primary={target.color_primary} secondary={target.color_secondary} size={58} />
          <Text style={{ ...font.extrabold, color: colors.chalk, textAlign: 'center' }}>{target.name}</Text>
        </View>
      </Gradient>

      {mine.length > 1 ? (
        <>
          <Label>Mon équipe</Label>
          <Chips options={mine.map((t) => ({ value: t.id, label: t.name }))} value={fromId} onChange={(v) => { if (v) { setFromId(v); setMatchId(null); } }} />
        </>
      ) : null}

      {open.length ? (
        <>
          <Kicker>Sur un de nos matchs</Kicker>
          <View style={s.chips}>
            {open.map((m) => (
              <Chip key={m.id} label={`${whenLabel(m.starts_at)} · ${m.venue.name}`} on={matchId === m.id} onPress={() => setMatchId(matchId === m.id ? null : m.id)} />
            ))}
          </View>
        </>
      ) : null}

      {!matchId ? (
        <>
          <Kicker>{open.length ? 'Ou sur un nouveau créneau' : 'Le créneau proposé'}</Kicker>
          <Label>Format</Label>
          <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={(v) => v && setFormat(v)} />
          <DateTimePicker value={when} onChange={setWhen} />
          <Label>Terrain</Label>
          <VenuePicker value={venue} onChange={onVenue} />
        </>
      ) : null}

      <Field
        label="Un mot pour l'équipe adverse"
        value={message}
        onChangeText={setMessage}
        maxLength={300}
        multiline
        placeholder="On vous attend de pied ferme 😤"
        style={{ minHeight: 70, textAlignVertical: 'top' }}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Envoyer le défi" icon="flash" onPress={submit} loading={loading} />
      {matchId ? <Text style={[s.sub, { textAlign: 'center' }]}>S'ils acceptent, ils deviennent l'adversaire de ce match.</Text> : (
        <Text style={[s.sub, { textAlign: 'center' }]}>S'ils acceptent, le match {formatLabel(format)} est créé et les deux capitaines y sont inscrits.</Text>
      )}
    </Screen>
  );
}
