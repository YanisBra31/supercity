// Cosmétiques de profil : pièces, cadre de photo (avec halo ou rotation), bannière à motif, titre et rareté.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { CosmeticBrief, Rarity } from '../lib/api';
import { AccentName, brand, Gradient } from './brand';
import { Flame } from './Streak';
import { Avatar, colors, font, readableOn } from './ui';

const native = typeof document === 'undefined';

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Commun', color: '#8d8079' },
  rare: { label: 'Rare', color: '#1e88e5' },
  epic: { label: 'Épique', color: '#7e57c2' },
  legendary: { label: 'Légendaire', color: '#c49000' },
};

export const GRADE_LABELS = ['Rookie', 'Espoir', 'Titulaire', 'Cadre', 'Star', 'Légende'];

const stops = (c: string[]) => (c.length >= 2 ? c : [c[0] ?? brand.orange1, c[0] ?? brand.orange2]) as unknown as readonly [string, string, ...string[]];

function useLoop(duration: number, reverse: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const step = (to: number) => Animated.timing(v, { toValue: to, duration, easing: reverse ? Easing.inOut(Easing.sin) : Easing.linear, useNativeDriver: native });
    const anim = Animated.loop(reverse ? Animated.sequence([step(1), step(0)]) : step(1));
    anim.start();
    return () => anim.stop();
  }, [v, duration, reverse]);
  return v;
}

/** Pièce Supercity : disque doré avec un ballon. */
export function Coin({ size = 18 }: { size?: number }) {
  return (
    <Gradient colors={['#ffe082', '#ffb300', '#c49000']} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: Math.max(1, size / 14), borderColor: '#fff3c4' }}>
      <Ionicons name="football" size={size * 0.6} color="#7a5200" />
    </Gradient>
  );
}

export function CoinAmount({ n, size = 16, color = colors.ink }: { n: number; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Coin size={size} />
      <Text style={[font.extrabold, { fontSize: size * 0.95, lineHeight: size * 1.3, color }]}>{n.toLocaleString('fr-FR')}</Text>
    </View>
  );
}

export function RarityTag({ rarity, small }: { rarity: Rarity; small?: boolean }) {
  const r = RARITY[rarity];
  return (
    <View style={[st.rarity, { borderColor: r.color }, small && { paddingHorizontal: 6, paddingVertical: 1 }]}>
      <Text style={[st.rarityText, { color: r.color }, small && { fontSize: 9.5 }]}>{r.label}</Text>
    </View>
  );
}

/** Halo qui respire derrière le cadre. */
function Glow({ size, color }: { size: number; color: string }) {
  const v = useLoop(1400, true);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.16] }) }],
      }}
    />
  );
}

/** Photo du joueur dans son cadre. Sans cadre : la pastille habituelle. */
export function FramedAvatar({
  frame,
  name,
  uri,
  size,
  tone = 'night',
  ring = true,
}: {
  frame?: CosmeticBrief | null;
  name: string;
  uri?: string | null;
  size: number;
  tone?: 'orange' | 'night' | AccentName;
  ring?: boolean;
}) {
  const spin = useLoop(3200, false);
  if (!frame) return <Avatar name={name} uri={uri} size={size} tone={tone} ring={ring} />;
  const look = frame.look;
  const pad = Math.max(3, Math.round(size * 0.07));
  const outer = size + pad * 2;
  const ringStyle = { position: 'absolute' as const, width: outer, height: outer, borderRadius: outer / 2 };
  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      {look.effect === 'glow' || look.effect === 'spin' ? <Glow size={outer} color={look.colors[0]} /> : null}
      {look.effect === 'spin' ? (
        <Animated.View style={[ringStyle, { overflow: 'hidden', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
          <Gradient colors={stops([look.colors[0], look.colors[1] ?? look.colors[0], look.colors[0]])} style={{ flex: 1 }} />
        </Animated.View>
      ) : (
        <Gradient colors={stops(look.colors)} style={ringStyle} />
      )}
      <View style={{ borderRadius: size / 2, borderWidth: Math.max(2, size * 0.025), borderColor: brand.chalk }}>
        <Avatar name={name} uri={uri} size={size - Math.max(2, size * 0.025) * 2} tone={tone} />
      </View>
    </View>
  );
}

/** Couleurs de la bannière, pour le fond dégradé d'un en-tête. */
export function bannerColors(banner?: CosmeticBrief | null) {
  return banner ? stops(banner.look.colors) : undefined;
}

/** Motif posé sur la bannière (à mettre en premier enfant d'un en-tête dégradé). */
export function BannerPattern({ banner }: { banner?: CosmeticBrief | null }) {
  const pattern = banner?.look.pattern;
  if (!pattern || pattern === 'none') return null;
  if (pattern === 'flames') {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}>
        <View style={{ position: 'absolute', right: 6, bottom: -6, flexDirection: 'row', alignItems: 'flex-end' }}>
          <Flame size={44} />
          <Flame size={70} />
          <Flame size={52} />
        </View>
      </View>
    );
  }
  const W = 600;
  const H = 400;
  const shapes: ReactNode[] = [];
  if (pattern === 'stripes') {
    for (let x = -H; x < W; x += 34) shapes.push(<Line key={x} x1={x} y1={H} x2={x + H} y2={0} stroke="#ffffff" strokeOpacity={0.13} strokeWidth={13} />);
  } else {
    for (let y = 10; y < H; y += 22) for (let x = (y / 22) % 2 ? 21 : 10; x < W; x += 22) shapes.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={2.6} fill="#ffffff" fillOpacity={0.18} />);
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H}>
        {shapes}
      </Svg>
    </View>
  );
}

/** Titre affiché sous le pseudo. */
export function TitleTag({ title, size = 'md' }: { title?: CosmeticBrief | null; size?: 'sm' | 'md' }) {
  if (!title) return null;
  const c = title.look.colors;
  const legendary = title.rarity === 'legendary';
  return (
    <Gradient colors={stops(c)} style={[st.title, size === 'sm' && { paddingHorizontal: 8, paddingVertical: 2 }, legendary && { borderWidth: 1, borderColor: '#fff3c4' }]}>
      {legendary ? <Ionicons name="sparkles" size={size === 'sm' ? 10 : 12} color={readableOn(c[0])} /> : null}
      <Text style={[st.titleText, { color: readableOn(c[0]) }, size === 'sm' && { fontSize: 10.5 }]} numberOfLines={1}>
        {title.name}
      </Text>
    </Gradient>
  );
}

/** Aperçu d'un cosmétique dans la boutique, porté par le joueur. */
export function CosmeticThumb({ item, name, uri }: { item: CosmeticBrief; name: string; uri?: string | null }) {
  if (item.type === 'frame') {
    return (
      <View style={st.thumb}>
        <FramedAvatar frame={item} name={name} uri={uri} size={58} />
      </View>
    );
  }
  if (item.type === 'banner') {
    return (
      <Gradient colors={stops(item.look.colors)} style={[st.thumb, { borderRadius: 14, overflow: 'hidden' }]}>
        <BannerPattern banner={item} />
      </Gradient>
    );
  }
  return (
    <View style={st.thumb}>
      <TitleTag title={item} size="sm" />
    </View>
  );
}

const st = StyleSheet.create({
  rarity: { borderWidth: 1.2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  rarityText: { ...font.bold, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, maxWidth: '100%' },
  titleText: { ...font.bold, fontSize: 12, letterSpacing: 0.3 },
  thumb: { height: 78, alignItems: 'center', justifyContent: 'center' },
});
