// Profil du joueur et ses prochains matchs.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { MatchCard } from '../../components/MatchCard';
import { Hero } from '../../components/brand';
import { Banner, Button, Chips, ErrorText, Field, Kicker, Label, Pill, s, Screen, Success } from '../../components/ui';
import { ApiError, Foot, get, Match, Position } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { FEET, LEVELS, POSITIONS } from '../../lib/format';

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.display_name ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [position, setPosition] = useState<Position | null>(user?.position ?? null);
  const [level, setLevel] = useState<number | null>(user?.level ?? null);
  const [foot, setFoot] = useState<Foot | null>(user?.strong_foot ?? null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      get<{ items: Match[] }>('/me/matches').then((r) => setMatches(r.items)).catch(() => undefined);
    }, [])
  );

  const save = async () => {
    setMsg('');
    setError('');
    setSaving(true);
    try {
      await updateProfile({ display_name: name, city: city || null, position, level, strong_foot: foot });
      setMsg('Profil enregistré.');
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen top>
      <Hero kicker="Ton profil de joueur" title={user?.display_name ?? ''} sub={user?.email}>
        <View style={[s.row, { marginTop: 10, flexWrap: 'wrap' }]}>
          {position ? <Pill text={POSITIONS.find((p) => p.value === position)!.label} tone="dark" /> : null}
          {level ? <Pill text={LEVELS[level - 1]} tone="dark" /> : null}
          {city ? <Pill text={city} tone="dark" /> : null}
        </View>
      </Hero>

      {user && !user.email_verified ? (
        <Banner icon="mail-unread-outline" title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." onPress={() => router.push('/verify')} />
      ) : null}
      <Kicker>Mes prochains matchs</Kicker>
      {matches.length ? matches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />) : <Text style={s.sub}>Aucun match prévu. Va voir l'onglet Matchs !</Text>}

      <Kicker>Mes infos</Kicker>
      <Field label="Pseudo" value={name} onChangeText={setName} />
      <Field label="Ville" value={city} onChangeText={setCity} />
      <Label>Poste</Label>
      <Chips options={POSITIONS} value={position} onChange={setPosition} allowEmpty />
      <Label>Niveau</Label>
      <Chips options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={level} onChange={setLevel} allowEmpty />
      <Label>Pied fort</Label>
      <Chips options={FEET} value={foot} onChange={setFoot} allowEmpty />
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      <Button title="Enregistrer" onPress={save} loading={saving} />
      <Kicker>Sécurité</Kicker>
      <Button title="Changer mon mot de passe" variant="dark" icon="lock-closed-outline" onPress={() => router.push('/password')} />
      <Button title="Se déconnecter" variant="ghost" onPress={logout} />
    </Screen>
  );
}
