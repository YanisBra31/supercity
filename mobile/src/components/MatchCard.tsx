import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Match } from '../lib/api';
import { euros } from '../lib/pay';
import { distanceLabel, formatLabel, formatShort, levelLabel, timeLabel } from '../lib/format';
import { Gradient } from './brand';
import { Card, colors, font, Meta, Pill } from './ui';
import { ON_FIRE } from './Streak';

const DAYS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function statusPill(m: Match) {
  // Mon statut d'abord (ce que je dois faire), puis l'état du match.
  if (m.status === 'cancelled') return <Pill text="Annulé" tone="grey" icon="close-circle" />;
  if (m.status === 'played') return m.ratings_left ? <Pill text="À noter" icon="star" /> : <Pill text="Terminé" tone="grey" icon="flag" />;
  if (m.my_status === 'registered') return <Pill text="Je joue" tone="green" icon="checkmark-circle" />;
  if (m.my_status === 'pending') return <Pill text="À payer" icon="card" />;
  if (m.my_status === 'waitlist') return <Pill text="Liste d'attente" tone="dark" icon="hourglass" />;
  if (m.status === 'full') return <Pill text="Complet" tone="dark" icon="lock-closed" />;
  if (m.spots_left <= 2) return <Pill text={`Plus que ${m.spots_left} place${m.spots_left > 1 ? 's' : ''}`} icon="flame" />;
  return <Pill text={`${m.spots_left} places`} tone="grey" />;
}

// Bloc date façon ticket : jour, numéro, mois, heure, sur le dégradé.
function DateBlock({ iso, dim }: { iso: string; dim: boolean }) {
  const d = new Date(iso);
  return (
    <Gradient tone={dim ? 'night' : 'orange'} style={st.date}>
      <Text style={st.dateDay}>{DAYS[d.getDay()]}</Text>
      <Text style={st.dateNum}>{d.getDate()}</Text>
      <Text style={st.dateMonth}>{MONTHS[d.getMonth()]}</Text>
      <View style={st.dateTime}>
        <Text style={st.dateTimeText}>{timeLabel(d)}</Text>
      </View>
    </Gradient>
  );
}

export function MatchCard({ match: m, index }: { match: Match; index?: number }) {
  const fill = Math.min(1, m.players_count / m.max_players);
  const dist = distanceLabel(m.venue.distance_km);
  const over = m.status === 'cancelled' || m.status === 'played';
  return (
    <Card index={index} onPress={() => router.push(`/match/${m.id}`)} style={st.card}>
      <DateBlock iso={m.starts_at} dim={over} />
      <View style={st.body}>
        <View style={st.head}>
          <Text style={st.format}>
            {m.kind === 'tournament' ? 'Tournoi' : formatLabel(m.format)} <Text style={{ color: colors.dim }}>· {formatShort(m.format)}</Text>
          </Text>
          {statusPill(m)}
        </View>
        <Text style={st.venue} numberOfLines={1}>
          {m.title ?? m.venue.name}
        </Text>
        <Meta icon="location-outline">{[m.title ? m.venue.name : null, m.venue.city, dist].filter(Boolean).join(' · ') || m.venue.address}</Meta>
        {m.organization ? <Meta icon="briefcase-outline">{m.organization.name}</Meta> : null}
        {m.home_team ? (
          <Meta icon="shield-outline">
            {m.score?.status === 'confirmed' && m.away_team
              ? `${m.home_team.name} ${m.score.home} - ${m.score.away} ${m.away_team.name}`
              : `${m.home_team.name}${(m.home_team.streak ?? 0) >= ON_FIRE ? ' 🔥' : ''} vs ${m.away_team ? `${m.away_team.name}${(m.away_team.streak ?? 0) >= ON_FIRE ? ' 🔥' : ''}` : 'adversaire à trouver'}`}
          </Meta>
        ) : (
          <Meta icon="stats-chart-outline">{levelLabel(m.level)}</Meta>
        )}
        <View style={st.bar}>
          <Gradient style={{ width: `${fill * 100}%`, height: 6, borderRadius: 3 }} />
        </View>
        <View style={st.foot}>
          <Ionicons name="people" size={13} color={colors.dim} />
          <Text style={st.count}>
            {m.players_count}/{m.max_players} joueurs
            {m.waitlist_count ? ` · ${m.waitlist_count} en attente` : ''}
          </Text>
          <Text style={[st.count, { marginLeft: 'auto', color: m.price_cents ? colors.ink : colors.success, ...font.bold }]}>{m.price_cents ? euros(m.price_cents) : 'Gratuit'}</Text>
        </View>
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', padding: 10, gap: 14 },
  date: { width: 74, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  dateDay: { ...font.semibold, fontSize: 11, letterSpacing: 1.6, color: colors.chalk, opacity: 0.9 },
  dateNum: { ...font.black, fontSize: 30, lineHeight: 36, color: colors.chalk },
  dateMonth: { ...font.medium, fontSize: 12, color: colors.chalk, marginTop: -2 },
  dateTime: { marginTop: 8, backgroundColor: colors.night, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  dateTimeText: { ...font.bold, fontSize: 12, color: colors.orange1 },
  body: { flex: 1, gap: 4, paddingVertical: 4, paddingRight: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  format: { ...font.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.orange2 },
  venue: { ...font.extrabold, fontSize: 17, color: colors.ink },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden', marginTop: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { ...font.medium, fontSize: 12, color: colors.dim },
});
