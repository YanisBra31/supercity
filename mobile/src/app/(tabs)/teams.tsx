// Mes équipes : créer, rejoindre avec un code, ouvrir.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { Button, Card, Chips, Empty, ErrorText, Field, IconButton, Kicker, Label, PageHeader, Pill, Screen, TeamCrest, colors, font, s } from '../../components/ui';
import { StreakBadge } from '../../components/Streak';
import { ApiError, Challenge, Format, get, post, Team } from '../../lib/api';
import { ChallengeCard } from '../../components/ChallengeCard';
import { FORMATS, formatLabel } from '../../lib/format';

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [format, setFormat] = useState<Format | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [challenges, setChallenges] = useState<{ received: Challenge[]; sent: Challenge[] }>({ received: [], sent: [] });
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    get<{ received: Challenge[]; sent: Challenge[] }>('/me/challenges').then(setChallenges).catch(() => undefined);
    try {
      setTeams((await get<{ items: Team[] }>('/me/teams')).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger tes équipes.');
      setTeams([]);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const respond = async (c: Challenge, action: 'accept' | 'decline' | 'cancel') => {
    setError('');
    if (action !== 'accept' && !(await confirmAsk(action === 'decline' ? 'Refuser le défi ?' : 'Retirer le défi ?'))) return;
    setBusy(c.id);
    try {
      const res = await post<Challenge>(`/challenges/${c.id}/${action}`);
      await load();
      if (action === 'accept' && res.match_id) router.push(`/match/${res.match_id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    } finally {
      setBusy(null);
    }
  };

  const all = [...challenges.received, ...challenges.sent];
  const live = all.filter((c) => c.status === 'pending');
  const past = all.filter((c) => c.status !== 'pending').slice(0, 4);

  const run = async (fn: () => Promise<Team>) => {
    setError('');
    setLoading(true);
    try {
      const t = await fn();
      setMode('none');
      setName('');
      setCity('');
      setCode('');
      router.push(`/team/${t.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Action impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen top>
      <PageHeader
        kicker="Ton vestiaire"
        title="Équipes"
        sub="Monte ton équipe, invite tes potes avec un code."
        right={mode === 'none' ? <IconButton icon="add" label="Créer une équipe" onPress={() => setMode('create')} dark /> : undefined}
      />
      {mode === 'none' ? (
        <View style={s.row}>
          <Button title="Rejoindre" icon="key-outline" variant="ghost" onPress={() => setMode('join')} style={{ flex: 1 }} />
          {teams?.some((t) => t.my_role === 'captain') ? (
            <Button title="Défier" icon="flash" variant="dark" onPress={() => router.push('/team/find')} style={{ flex: 1 }} />
          ) : null}
        </View>
      ) : null}

      {mode === 'create' ? (
        <Card>
          <Field label="Nom de l'équipe" value={name} onChangeText={setName} placeholder="Cartel Narvalo" />
          <Field label="Ville" value={city} onChangeText={setCity} />
          <Label>Format habituel</Label>
          <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={setFormat} allowEmpty />
          <ErrorText>{error}</ErrorText>
          <Button title="Créer l'équipe" loading={loading} onPress={() => run(() => post<Team>('/teams', { name, city: city || null, usual_format: format }))} />
          <Button title="Annuler" variant="ghost" onPress={() => setMode('none')} />
        </Card>
      ) : null}

      {mode === 'join' ? (
        <Card>
          <Field label="Code d'invitation" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={8} placeholder="8 caractères, donné par ton capitaine" />
          <ErrorText>{error}</ErrorText>
          <Button title="Rejoindre l'équipe" loading={loading} onPress={() => run(() => post<Team>('/teams/join', { invite_code: code }))} />
          <Button title="Annuler" variant="ghost" onPress={() => setMode('none')} />
        </Card>
      ) : null}

      {mode === 'none' ? <ErrorText>{error}</ErrorText> : null}

      {live.length ? <Kicker>{`Défis en cours (${live.length})`}</Kicker> : null}
      {live.map((c, i) => (
        <ChallengeCard key={c.id} c={c} index={i} busy={busy === c.id} onAccept={() => respond(c, 'accept')} onDecline={() => respond(c, 'decline')} onCancel={() => respond(c, 'cancel')} />
      ))}
      {teams?.length ? <Kicker>Mes équipes</Kicker> : null}

      {teams?.length === 0 ? (
        <Empty icon="people-outline" title="Pas encore d'équipe" text="Crée la tienne ou rejoins celle de tes potes avec leur code." />
      ) : null}
      {teams?.map((t, i) => (
        <Card key={t.id} index={i} onPress={() => router.push(`/team/${t.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 17, ...font.extrabold, color: colors.ink, flex: 1 }}>{t.name}</Text>
            <StreakBadge count={t.streak?.current} />
            {t.my_role === 'captain' ? <Pill text="Capitaine" /> : null}
          </View>
          <Text style={s.sub}>
            {t.members_count} joueur{t.members_count > 1 ? 's' : ''}
            {t.city ? ` · ${t.city}` : ''}
            {t.usual_format ? ` · ${formatLabel(t.usual_format)}` : ''}
          </Text>
          </View>
        </Card>
      ))}
      {past.length ? <Kicker>Derniers défis</Kicker> : null}
      {past.map((c, i) => (
        <ChallengeCard key={c.id} c={c} index={i} />
      ))}
    </Screen>
  );
}

function confirmAsk(title: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(title) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, undefined, [
      { text: 'Non', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Oui', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}
