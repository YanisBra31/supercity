// Séries de victoires : flamme animée, badge de série, forme récente, roi du terrain et bannière d'événement bonus.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BonusEvent, Streak, VenueKing } from '../lib/api';
import { dayLabel, timeLabel } from '../lib/format';
import { Gradient } from './brand';
import { Card, colors, font, TeamCrest } from './ui';

// Même seuil que l'API (series.php) : à partir de 3 victoires d'affilée, l'équipe est en feu.
export const ON_FIRE = 3;

const FIRE = { outer: '#ff3d00', mid: '#ff8a00', core: '#ffd54f', ember: '#ffb300' };

/** Boucle d'une valeur entre 0 et 1, avec un décalage pour que les couches ne battent pas ensemble. */
function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return v;
}

/** Étincelle qui monte et s'éteint au-dessus de la flamme. */
function Ember({ size, x, delay }: { size: number; x: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true })])
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  const dot = Math.max(2, size * 0.09);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: size * 0.55,
        left: size / 2 + x - dot / 2,
        width: dot,
        height: dot,
        borderRadius: dot,
        backgroundColor: FIRE.ember,
        opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.7] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, x * 0.4, -x * 0.2] }) },
        ],
      }}
    />
  );
}

/** Flamme vivante : trois couches qui vacillent, un halo qui respire et des étincelles. Immobile si `still`. */
export function Flame({ size = 28, still = false }: { size?: number; still?: boolean }) {
  const a = useLoop(420);
  const b = useLoop(340, 120);
  const glow = useLoop(900);
  if (still) return <Ionicons name="flame" size={size} color={FIRE.mid} />;
  const layer = (v: Animated.Value, sx: number[], sy: number[], rot: string[]) => ({
    transform: [
      { translateY: size * 0.08 },
      { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: sx }) },
      { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: sy }) },
      { rotate: v.interpolate({ inputRange: [0, 1], outputRange: rot }) },
      { translateY: -size * 0.08 },
    ],
  });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: size * 0.02,
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size,
          backgroundColor: FIRE.core,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) }],
        }}
      />
      <Animated.View style={[st.layer, layer(a, [1, 0.94], [0.96, 1.08], ['-4deg', '4deg'])]}>
        <Ionicons name="flame" size={size} color={FIRE.outer} />
      </Animated.View>
      <Animated.View style={[st.layer, layer(b, [0.95, 1.02], [1.04, 0.94], ['3deg', '-3deg'])]}>
        <Ionicons name="flame" size={size * 0.78} color={FIRE.mid} />
      </Animated.View>
      <Animated.View style={[st.layer, layer(a, [1, 0.9], [0.92, 1.1], ['2deg', '-2deg'])]}>
        <Ionicons name="flame" size={size * 0.48} color={FIRE.core} />
      </Animated.View>
      <Ember size={size} x={-size * 0.18} delay={0} />
      <Ember size={size} x={size * 0.15} delay={450} />
      <Ember size={size} x={0} delay={800} />
    </View>
  );
}

/** Badge de série : rien sous 2 victoires, flamme fixe à 2, flamme vivante à partir de 3. */
export function StreakBadge({ count, size = 'sm', onDark = false }: { count?: number; size?: 'sm' | 'md' | 'lg'; onDark?: boolean }) {
  if (!count || count < 2) return null;
  const hot = count >= ON_FIRE;
  const icon = { sm: 14, md: 20, lg: 34 }[size];
  const text = { sm: 11, md: 13, lg: 18 }[size];
  return (
    <View style={[st.badge, { backgroundColor: onDark ? 'rgba(0,0,0,.35)' : hot ? 'rgba(255,61,0,.14)' : colors.tint, paddingHorizontal: size === 'lg' ? 12 : 8 }]}>
      <Flame size={icon} still={!hot} />
      <Text style={{ ...font.extrabold, fontSize: text, color: onDark ? (hot ? FIRE.core : colors.chalk) : hot ? FIRE.outer : colors.orange2 }}>
        {size === 'sm' ? count : `${count} victoires d'affilée`}
      </Text>
    </View>
  );
}

/** Forme récente : pastilles V (victoire), N (nul), D (défaite), la plus récente à gauche. */
export function FormDots({ form }: { form: Streak['form'] }) {
  if (!form.length) return null;
  const tone = { W: colors.success, D: '#9e9e9e', L: colors.danger };
  const label = { W: 'V', D: 'N', L: 'D' };
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {form.map((r, i) => (
        <View key={i} style={[st.dot, { backgroundColor: tone[r] }]}>
          <Text style={st.dotText}>{label[r]}</Text>
        </View>
      ))}
    </View>
  );
}

/** Carte de série d'une équipe (page équipe). */
export function StreakCard({ streak }: { streak?: Streak }) {
  if (!streak || (!streak.form.length && !streak.best)) return null;
  const hot = streak.on_fire;
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {hot ? <Flame size={52} /> : <Ionicons name="trending-up" size={34} color={colors.orange2} />}
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ ...font.semibold, fontSize: 11, letterSpacing: 1.6, color: hot ? FIRE.core : colors.orange2 }}>
          {hot ? 'EN FEU' : 'SÉRIE EN COURS'}
        </Text>
        <Text style={{ ...font.extrabold, fontSize: 18, color: hot ? colors.chalk : colors.ink }}>
          {streak.current > 0 ? `${streak.current} victoire${streak.current > 1 ? 's' : ''} d'affilée` : 'Pas de série en cours'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <FormDots form={streak.form} />
          {streak.best > 1 ? <Text style={{ ...font.medium, fontSize: 12, color: hot ? 'rgba(255,248,241,.75)' : colors.dim }}>Record : {streak.best}</Text> : null}
        </View>
      </View>
    </View>
  );
  return hot ? (
    <Gradient colors={['#2a0f05', '#5a1a00', '#b33a00']} style={{ borderRadius: 20, padding: 16 }}>
      {inner}
    </Gradient>
  ) : (
    <Card>{inner}</Card>
  );
}

/** Roi du terrain : l'équipe qui enchaîne les victoires sur ce terrain. */
export function KingCard({ king }: { king?: VenueKing | null }) {
  if (!king) return null;
  const t = king.team;
  return (
    <Card onPress={() => router.push(`/team/${t.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View>
        <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={44} />
        <View style={st.crown}>
          <Ionicons name="trophy" size={12} color="#c49000" />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...font.semibold, fontSize: 11, letterSpacing: 1.6, color: colors.orange2 }}>ROI DU TERRAIN</Text>
        <Text style={{ ...font.bold, fontSize: 16, color: colors.ink }}>{t.name}</Text>
        <Text style={{ ...font.regular, fontSize: 13, color: colors.dim }}>{king.streak} victoires d'affilée ici. Qui les arrête ?</Text>
      </View>
      {king.on_fire ? <Flame size={30} /> : <Ionicons name="flame" size={24} color={FIRE.mid} />}
    </Card>
  );
}

/** Ce que rapporte un événement : « Points x2 · +3 pts par match ». */
export function bonusLabel(e: BonusEvent): string {
  return [e.multiplier > 1 ? `Points x${e.multiplier}` : null, e.bonus_points ? `+${e.bonus_points} pt${e.bonus_points > 1 ? 's' : ''} par match` : null]
    .filter(Boolean)
    .join(' · ');
}

/** « jusqu'à dim. 19 oct. 23h59 » ou « dès sam. 18 oct. 10h00 ». */
export function bonusWhen(e: BonusEvent): string {
  const d = new Date(e.active ? e.ends_at : e.starts_at);
  return `${e.active ? "jusqu'à" : 'dès'} ${dayLabel(d).toLowerCase()} ${timeLabel(d)}`;
}

/** Bannière d'événement bonus (accueil, match). */
export function BonusBanner({ event, compact = false }: { event: BonusEvent; compact?: boolean }) {
  return (
    <Gradient colors={event.active ? ['#ff3d00', '#ff8a00', '#ffb300'] : ['#3a2a20', '#1f1a17']} style={{ borderRadius: 18, padding: compact ? 12 : 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {event.active ? <Flame size={compact ? 26 : 36} /> : <Ionicons name="flash" size={compact ? 22 : 30} color={FIRE.core} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...font.semibold, fontSize: 11, letterSpacing: 1.6, color: event.active ? '#fff3e0' : FIRE.core }}>
            {event.active ? 'ÉVÉNEMENT EN COURS' : 'ÉVÉNEMENT À VENIR'}
          </Text>
          <Text style={{ ...font.extrabold, fontSize: compact ? 15 : 17, color: '#fff' }}>{event.title}</Text>
          <Text style={{ ...font.semibold, fontSize: 13, color: '#fff' }}>{bonusLabel(event)}</Text>
          <Text style={{ ...font.regular, fontSize: 12, color: 'rgba(255,255,255,.85)' }}>
            {bonusWhen(event)}
            {event.venue ? ` · à ${event.venue.name}` : ''}
          </Text>
          {!compact && event.description ? <Text style={{ ...font.regular, fontSize: 13, color: '#fff', marginTop: 4 }}>{event.description}</Text> : null}
        </View>
      </View>
    </Gradient>
  );
}

const st = StyleSheet.create({
  layer: { position: 'absolute', bottom: 0, alignItems: 'center' },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 3 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotText: { ...font.bold, fontSize: 10, color: '#fff' },
  crown: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff8e1', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#ffd54f' },
});
