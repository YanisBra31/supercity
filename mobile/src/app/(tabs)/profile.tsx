// Profil du joueur et ses prochains matchs.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { MatchCard } from '../../components/MatchCard';
import { Button, Chips, colors, ErrorText, Field, Label, s, Screen } from '../../components/ui';
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
    <Screen>
      <View style={[s.row, { gap: 14 }]}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.orange2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.white, fontSize: 28, fontWeight: '900' }}>{(user?.display_name ?? '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>{user?.display_name}</Text>
          <Text style={s.sub}>{user?.email}</Text>
        </View>
      </View>

      <Label>Mes prochains matchs</Label>
      {matches.length ? matches.map((m) => <MatchCard key={m.id} match={m} />) : <Text style={s.sub}>Aucun match prévu. Va voir l'onglet Matchs !</Text>}

      <Field label="Pseudo" value={name} onChangeText={setName} />
      <Field label="Ville" value={city} onChangeText={setCity} />
      <Label>Poste</Label>
      <Chips options={POSITIONS} value={position} onChange={setPosition} allowEmpty />
      <Label>Niveau</Label>
      <Chips options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={level} onChange={setLevel} allowEmpty />
      <Label>Pied fort</Label>
      <Chips options={FEET} value={foot} onChange={setFoot} allowEmpty />
      <ErrorText>{error}</ErrorText>
      {msg ? <Text style={{ color: colors.success, textAlign: 'center' }}>{msg}</Text> : null}
      <Button title="Enregistrer" onPress={save} loading={saving} />
      <Button title="Se déconnecter" variant="ghost" onPress={logout} />
    </Screen>
  );
}
