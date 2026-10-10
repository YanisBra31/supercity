import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Match } from '../lib/api';
import { distanceLabel, formatLabel, formatShort, levelLabel, whenLabel } from '../lib/format';
import { Card, colors, Pill, s } from './ui';

export function statusPill(m: Match) {
  if (m.status === 'cancelled') return <Pill text="Annulé" tone="grey" />;
  if (m.status === 'played') return <Pill text="Joué" tone="grey" />;
  if (m.my_status === 'registered') return <Pill text="Inscrit" tone="green" />;
  if (m.my_status === 'waitlist') return <Pill text="Liste d'attente" tone="dark" />;
  if (m.status === 'full') return <Pill text="Complet" tone="dark" />;
  return <Pill text={`${m.spots_left} place${m.spots_left > 1 ? 's' : ''}`} />;
}

export function MatchCard({ match: m }: { match: Match }) {
  const fill = Math.min(1, m.players_count / m.max_players);
  const dist = distanceLabel(m.venue.distance_km);
  return (
    <Card onPress={() => router.push(`/match/${m.id}`)}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.orange2, textTransform: 'uppercase' }}>
          {formatLabel(m.format)} · {formatShort(m.format)}
        </Text>
        {statusPill(m)}
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{whenLabel(m.starts_at)}</Text>
      <View style={s.row}>
        <Ionicons name="location-outline" size={16} color={colors.dim} />
        <Text style={[s.sub, { flex: 1 }]} numberOfLines={1}>
          {m.venue.name}
          {dist ? ` · ${dist}` : ''}
        </Text>
      </View>
      <View style={s.row}>
        <Ionicons name="stats-chart-outline" size={16} color={colors.dim} />
        <Text style={s.sub}>{levelLabel(m.level)}</Text>
      </View>
      <View style={{ gap: 6, marginTop: 4 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden' }}>
          <View style={{ width: `${fill * 100}%`, height: 6, backgroundColor: colors.orange2 }} />
        </View>
        <Text style={{ fontSize: 12, color: colors.dim }}>
          {m.players_count}/{m.max_players} joueurs
          {m.waitlist_count ? ` · ${m.waitlist_count} en attente` : ''}
        </Text>
      </View>
    </Card>
  );
}
