// Sélecteurs partagés : jour, heure et terrain.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { get, Venue } from '../lib/api';
import { dayLabel, distanceLabel, surfaceLabel, timeLabel } from '../lib/format';
import { getPosition } from '../lib/location';
import { takeLastVenue } from '../lib/venueStore';
import { Button, Card, Chip, colors, Field, font, Label, s } from './ui';

const TIMES = Array.from({ length: 32 }, (_, i) => 8 * 60 + i * 30); // 8h00 → 23h30

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {children}
    </ScrollView>
  );
}

/** Jour (3 semaines à venir) puis heure par demi-heure ; renvoie la date complète ou null. */
export function DateTimePicker({ value, onChange }: { value: Date | null; onChange: (d: Date | null) => void }) {
  const days = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        return d;
      }),
    []
  );
  const [day, setDay] = useState(0);
  const minutes = value ? value.getHours() * 60 + value.getMinutes() : null;
  const at = (d: number, m: number) => {
    const t = new Date(days[d]);
    t.setMinutes(m);
    return t;
  };
  return (
    <>
      <Label>Jour</Label>
      <HScroll>
        {days.map((d, i) => (
          <Chip key={i} label={dayLabel(d)} on={i === day} onPress={() => { setDay(i); onChange(null); }} />
        ))}
      </HScroll>
      <Label>Heure</Label>
      <HScroll>
        {TIMES.filter((m) => at(day, m).getTime() > Date.now() + 15 * 60 * 1000).map((m) => (
          <Chip key={m} label={timeLabel(at(day, m))} on={m === minutes && value?.toDateString() === days[day].toDateString()} onPress={() => onChange(at(day, m))} />
        ))}
      </HScroll>
    </>
  );
}

/** Recherche de terrain autour de soi, ou ajout d'un nouveau terrain. */
export function VenuePicker({ value, onChange }: { value: Venue | null; onChange: (v: Venue | null) => void }) {
  const [q, setQ] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const load = useCallback(async (search: string) => {
    const pos = await getPosition();
    const res = await get<{ items: Venue[] }>('/venues', { lat: pos?.lat, lng: pos?.lng, radius_km: pos ? 30 : undefined, q: search, limit: 8 }).catch(() => ({
      items: [] as Venue[],
    }));
    setVenues(res.items);
  }, []);
  useFocusEffect(
    useCallback(() => {
      const created = takeLastVenue();
      if (created) onChange(created);
      load('');
    }, [load, onChange])
  );
  if (value) {
    return (
      <Card style={{ borderColor: colors.orange2, borderWidth: 2 }} onPress={() => onChange(null)}>
        <Text style={{ ...font.extrabold, fontSize: 16, color: colors.ink }}>{value.name}</Text>
        <Text style={s.sub}>{value.address}</Text>
        <Text style={{ ...font.semibold, color: colors.orange2 }}>Changer de terrain</Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Field label="Chercher un terrain" value={q} onChangeText={(t) => { setQ(t); load(t); }} placeholder="Nom ou adresse" />
      {venues.map((v) => (
        <Card key={v.id} onPress={() => onChange(v)}>
          <Text style={{ ...font.bold, color: colors.ink }}>{v.name}</Text>
          <Text style={s.sub}>
            {surfaceLabel(v.surface)}
            {v.distance_km !== null ? ` · ${distanceLabel(v.distance_km)}` : ''} · {v.address}
          </Text>
        </Card>
      ))}
      {!venues.length ? <Text style={s.sub}>Aucun terrain trouvé ici pour l'instant.</Text> : null}
      <Button title="Ajouter un terrain" variant="ghost" icon="add" onPress={() => router.push('/venue/new')} />
    </View>
  );
}
