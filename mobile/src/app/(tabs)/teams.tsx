// Mes équipes : créer, rejoindre avec un code, ouvrir.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Hero } from '../../components/brand';
import { Button, Avatar, Card, Chips, colors, Empty, ErrorText, Field, Label, Pill, s, Screen, font } from '../../components/ui';
import { ApiError, Format, get, post, Team } from '../../lib/api';
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

  const load = useCallback(async () => {
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
      <Hero kicker="Ton vestiaire" title="Mes équipes" sub="Monte ton équipe, invite tes potes avec un code." />
      {mode === 'none' ? (
        <View style={[s.row]}>
          <Button title="Créer" icon="add" onPress={() => setMode('create')} style={{ flex: 1 }} />
          <Button title="Rejoindre" icon="key-outline" variant="dark" onPress={() => setMode('join')} style={{ flex: 1 }} />
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

      {teams?.length === 0 ? (
        <Empty icon="people-outline" title="Pas encore d'équipe" text="Crée la tienne ou rejoins celle de tes potes avec leur code." />
      ) : null}
      {teams?.map((t, i) => (
        <Card key={t.id} index={i} onPress={() => router.push(`/team/${t.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={t.name} size={50} tone={i % 2 ? 'night' : 'orange'} />
          <View style={{ flex: 1, gap: 2 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 17, ...font.extrabold, color: colors.ink, flex: 1 }}>{t.name}</Text>
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
    </Screen>
  );
}
