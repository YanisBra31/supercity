// Grade du joueur : badge compact, et carte de progression vers le grade suivant.
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Grade, Role } from '../lib/api';
import { brand, Gradient } from './brand';
import { colors, font } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const GRADE_STYLE: Record<Grade['key'], { icon: IconName; colors: readonly [string, string] }> = {
  rookie: { icon: 'football-outline', colors: ['#b8aca3', '#8d8079'] },
  espoir: { icon: 'leaf', colors: ['#66bb6a', '#2e7d32'] },
  titulaire: { icon: 'shirt', colors: ['#42a5f5', '#1565c0'] },
  cadre: { icon: 'shield-half', colors: ['#ab47bc', '#4527a0'] },
  star: { icon: 'star', colors: [brand.orange1, brand.orange2] },
  legende: { icon: 'trophy', colors: ['#ffd54f', '#c49000'] },
};

export function GradeBadge({ grade, size = 'sm' }: { grade?: Grade; size?: 'sm' | 'md' }) {
  if (!grade) return null;
  const g = GRADE_STYLE[grade.key] ?? GRADE_STYLE.rookie;
  const md = size === 'md';
  return (
    <Gradient colors={g.colors} style={[st.badge, md && st.badgeMd]}>
      <Ionicons name={g.icon} size={md ? 14 : 11} color="#fff" />
      <Text style={[st.badgeText, md && { fontSize: 12 }]}>{grade.label}</Text>
    </Gradient>
  );
}

export function GradeCard({ grade }: { grade?: Grade }) {
  const w = useRef(new Animated.Value(0)).current;
  const ratio = grade && grade.next_at ? (grade.points - grade.min) / (grade.next_at - grade.min) : 1;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0.04, Math.min(1, ratio)), duration: 900, delay: 200, useNativeDriver: false }).start();
  }, [w, ratio]);
  if (!grade) return null;
  const g = GRADE_STYLE[grade.key] ?? GRADE_STYLE.rookie;
  const left = grade.next_at ? grade.next_at - grade.points : 0;
  return (
    <View style={st.card}>
      <View style={st.row}>
        <Gradient colors={g.colors} style={st.medal}>
          <Ionicons name={g.icon} size={26} color="#fff" />
        </Gradient>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.kicker}>Grade {grade.level}/6</Text>
          <Text style={st.title}>{grade.label}</Text>
          <Text style={st.sub}>
            {grade.next_label
              ? `Encore ${left} point${left > 1 ? 's' : ''} pour devenir ${grade.next_label}`
              : 'Grade maximum atteint. Respect.'}
          </Text>
        </View>
        <Text style={st.points}>{grade.points} pts</Text>
      </View>
      <View style={st.track}>
        <Animated.View style={{ height: 8, borderRadius: 4, overflow: 'hidden', width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
          <Gradient colors={g.colors} style={{ flex: 1 }} />
        </Animated.View>
      </View>
      <Text style={st.hint}>1 point par match joué, 2 de plus par victoire, 2 par match organisé. Chaque point rapporte 10 pièces pour la boutique.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { ...font.bold, fontSize: 10.5, color: '#fff', letterSpacing: 0.3 },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  medal: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...font.semibold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.orange2 },
  title: { ...font.extrabold, fontSize: 20, color: colors.ink },
  sub: { ...font.regular, fontSize: 13, color: colors.dim },
  points: { ...font.extrabold, fontSize: 16, color: colors.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.tint, overflow: 'hidden' },
  hint: { ...font.regular, fontSize: 11.5, color: colors.dim },
});

/** Badge « Admin » ou « Modo » ; rien pour un joueur. */
export function RoleBadge({ role }: { role?: Role }) {
  if (!role || role === 'user') return null;
  const admin = role === 'admin';
  return (
    <View style={[st.badge, { backgroundColor: admin ? brand.night : '#2e7d32' }]}>
      <Ionicons name={admin ? 'shield-checkmark' : 'shield-half'} size={11} color="#fff" />
      <Text style={st.badgeText}>{admin ? 'Admin' : 'Modo'}</Text>
    </View>
  );
}
