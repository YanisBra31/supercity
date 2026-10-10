// Version web : react-native-maps ne fonctionne que sur téléphone, on affiche les terrains en liste.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import type { MapProps } from './MatchMap';
import { distanceLabel, whenLabel } from '../lib/format';
import { Card, colors, Empty, font, s } from './ui';

export function MatchMap({ matches }: MapProps) {
  const byVenue = new Map<number, { name: string; distance: number | null; items: typeof matches }>();
  for (const m of matches) {
    const e = byVenue.get(m.venue.id) ?? { name: m.venue.name, distance: m.venue.distance_km, items: [] };
    e.items.push(m);
    byVenue.set(m.venue.id, e);
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Ionicons name="phone-portrait-outline" size={18} color={colors.dim} />
        <Text style={s.sub}>La carte interactive s'affiche dans l'appli sur téléphone.</Text>
      </View>
      {byVenue.size === 0 ? <Empty icon="map-outline" title="Aucun terrain avec un match" /> : null}
      {[...byVenue.entries()].map(([id, v]) => (
        <Card key={id}>
          <Text style={{ ...font.bold, fontSize: 16, color: colors.ink }}>{v.name}</Text>
          {v.distance !== null ? <Text style={s.sub}>{distanceLabel(v.distance)}</Text> : null}
          {v.items.map((m) => (
            <Text key={m.id} onPress={() => router.push(`/match/${m.id}`)} style={{ ...font.semibold, color: colors.orange2 }}>
              {whenLabel(m.starts_at)} · {m.spots_left} place{m.spots_left > 1 ? 's' : ''}
            </Text>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
