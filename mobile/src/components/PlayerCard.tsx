// Carte joueur façon FUT : note globale, poste, photo, six stats et étoiles (pied faible, gestes techniques).
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gradient } from './brand';
import { Avatar, colors, font } from './ui';
import { CardStat, PlayerCard as Card, Position } from '../lib/api';

export const CARD_STATS: { key: CardStat; short: string; label: string }[] = [
  { key: 'pac', short: 'VIT', label: 'Vitesse' },
  { key: 'sho', short: 'TIR', label: 'Tir' },
  { key: 'pas', short: 'PAS', label: 'Passe' },
  { key: 'dri', short: 'DRI', label: 'Dribble' },
  { key: 'def', short: 'DEF', label: 'Défense' },
  { key: 'phy', short: 'PHY', label: 'Physique' },
];
const POS: Record<Position, string> = { gardien: 'GB', defenseur: 'DEF', milieu: 'MIL', attaquant: 'ATT' };

/** Bronze, argent, or, puis la carte noire des meilleurs. */
function tier(overall: number) {
  if (overall >= 87) return { stops: ['#3a302b', '#1f1a17'] as const, ink: '#ffd54f', line: 'rgba(255,213,79,.35)' };
  if (overall >= 75) return { stops: ['#fff0b8', '#d9a92c'] as const, ink: '#3b2a05', line: 'rgba(59,42,5,.2)' };
  if (overall >= 65) return { stops: ['#f4f6f8', '#a3acb4'] as const, ink: '#23292e', line: 'rgba(35,41,46,.2)' };
  return { stops: ['#f0c79c', '#a0643a'] as const, ink: '#3a1f0c', line: 'rgba(58,31,12,.2)' };
}

export function Stars({ n, size = 12, color, onPick }: { n: number; size?: number; color: string; onPick?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onPick ? 6 : 1 }}>
      {[1, 2, 3, 4, 5].map((i) =>
        onPick ? (
          <Pressable key={i} onPress={() => onPick(i)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${i} étoile${i > 1 ? 's' : ''}`}>
            <Ionicons name={i <= n ? 'star' : 'star-outline'} size={size} color={color} />
          </Pressable>
        ) : (
          <Ionicons key={i} name={i <= n ? 'star' : 'star-outline'} size={size} color={color} />
        )
      )}
    </View>
  );
}

export function PlayerCardView({ card, name, uri, position }: { card: Card; name: string; uri: string | null; position: Position | null }) {
  const t = tier(card.overall);
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Gradient colors={t.stops} style={st.card}>
        <View style={st.top}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[st.overall, { color: t.ink }]}>{card.overall}</Text>
            <Text style={[st.pos, { color: t.ink }]}>{position ? POS[position] : 'JOU'}</Text>
          </View>
          <Avatar name={name} uri={uri} size={96} />
        </View>
        <Text style={[st.name, { color: t.ink, borderColor: t.line }]} numberOfLines={1}>
          {name.toUpperCase()}
        </Text>
        <View style={st.grid}>
          {CARD_STATS.map((s) => (
            <View key={s.key} style={st.stat}>
              <Text style={[st.statNum, { color: t.ink }]}>{card.stats[s.key]}</Text>
              <Text style={[st.statLabel, { color: t.ink }]}>{s.short}</Text>
            </View>
          ))}
        </View>
        <View style={[st.stars, { borderColor: t.line }]}>
          <View style={st.starRow}>
            <Text style={[st.starLabel, { color: t.ink }]}>Pied faible</Text>
            <Stars n={card.weak_foot} color={t.ink} />
          </View>
          <View style={st.starRow}>
            <Text style={[st.starLabel, { color: t.ink }]}>Gestes</Text>
            <Stars n={card.skill_moves} color={t.ink} />
          </View>
        </View>
      </Gradient>
      <Text style={st.caption}>
        {card.estimated
          ? `Estimation du joueur · ${card.votes}/3 votes pour la confirmer`
          : `Notée par ses coéquipiers · ${card.votes} vote${card.votes > 1 ? 's' : ''}`}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { width: 250, borderRadius: 26, borderTopLeftRadius: 60, borderTopRightRadius: 60, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  overall: { ...font.black, fontSize: 44, lineHeight: 48 },
  pos: { ...font.extrabold, fontSize: 15, letterSpacing: 1 },
  name: { ...font.black, fontSize: 18, textAlign: 'center', letterSpacing: 0.5, paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  stat: { width: '50%', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  statNum: { ...font.black, fontSize: 19 },
  statLabel: { ...font.semibold, fontSize: 13, letterSpacing: 0.5, width: 32 },
  stars: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  starLabel: { ...font.semibold, fontSize: 12 },
  caption: { ...font.medium, fontSize: 12, color: colors.dim, textAlign: 'center' },
});
