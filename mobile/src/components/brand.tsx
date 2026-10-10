// Éléments de marque repris du site : ballon, chargement, dégradé, lignes de terrain, apparitions.
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

export const brand = {
  orange1: '#ff9417',
  orange2: '#ff5223',
  night: '#1f1a17',
  night2: '#2e2723',
  chalk: '#fff8f1',
};

// Animations JS sur le web (pas de pilote natif), natives ailleurs.
const native = typeof document === 'undefined';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ball({ size = 44, color = brand.chalk, ink = brand.night }: { size?: number; color?: string; ink?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="30" fill={color} stroke={ink} strokeWidth="3" />
      <Polygon points="32,20 43,28 39,41 25,41 21,28" fill={ink} />
      <Path d="M32 20V4M43 28l15-5M39 41l9 13M25 41l-9 13M21 28L6 23" stroke={ink} strokeWidth="3" fill="none" />
    </Svg>
  );
}

// Couleurs d'accent que le joueur peut choisir pour son profil.
export const ACCENTS = {
  orange: { label: 'Orange', stops: [brand.orange1, '#ff7a1e', brand.orange2], solid: brand.orange2 },
  nuit: { label: 'Nuit', stops: ['#4a3f38', brand.night2, brand.night], solid: brand.night },
  rouge: { label: 'Rouge', stops: ['#ff5a5f', '#e53935', '#b71c1c'], solid: '#e53935' },
  bleu: { label: 'Bleu', stops: ['#42a5f5', '#1e88e5', '#1565c0'], solid: '#1e88e5' },
  vert: { label: 'Vert', stops: ['#66bb6a', '#2e9d4f', '#1b5e20'], solid: '#2e9d4f' },
  violet: { label: 'Violet', stops: ['#ab47bc', '#7e57c2', '#4527a0'], solid: '#7e57c2' },
} as const;
export type AccentName = keyof typeof ACCENTS;

// Le dégradé orange du site (diagonale), nuit, un accent, ou deux couleurs libres (équipes).
export function Gradient({
  children,
  style,
  tone = 'orange',
  colors,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'orange' | 'night' | AccentName;
  colors?: readonly [string, string, ...string[]];
}) {
  const stops =
    colors ??
    (tone === 'night' ? ([brand.night2, brand.night] as const) : (ACCENTS[tone === 'orange' ? 'orange' : tone].stops as readonly [string, string, string]));
  return (
    <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

function useLoop(duration: number, easing = Easing.linear, reverse = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const step = Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: native });
    const anim = reverse
      ? Animated.loop(Animated.sequence([step, Animated.timing(v, { toValue: 0, duration, easing, useNativeDriver: native })]))
      : Animated.loop(step);
    anim.start();
    return () => anim.stop();
  }, [v, duration, easing, reverse]);
  return v;
}

// Ballon qui rebondit et tourne, avec son ombre : le chargement de Supercity.
export function BouncingBall({ size = 44, color, ink }: { size?: number; color?: string; ink?: string }) {
  const bounce = useLoop(400, Easing.bezier(0.5, 0, 0.5, 1), true);
  const spin = useLoop(1600);
  const lift = size * 0.9;
  return (
    <View style={{ width: size, height: size + lift + 8, alignItems: 'center' }}>
      <Animated.View
        style={{
          transform: [
            { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) },
            { scaleY: bounce.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0.88] }) },
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }}
      >
        <Ball size={size} color={color} ink={ink} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          width: size * 0.8,
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(31,26,23,.25)',
          opacity: bounce.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ scaleX: bounce.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }}
      />
    </View>
  );
}

// Rond central qui se trace autour du ballon, comme le chargement du site.
export function BallLoader({ size = 120, onDark = true }: { size?: number; onDark?: boolean }) {
  const ring = useLoop(1600, Easing.bezier(0.65, 0, 0.35, 1));
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={onDark ? brand.chalk : brand.orange2}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [c, 0, -c] })}
        />
      </Svg>
      <BouncingBall size={size * 0.34} ink={brand.night} color={onDark ? brand.chalk : '#fff'} />
    </View>
  );
}

// « Supercity » dont les lettres ondulent l'une après l'autre.
export function WaveWord({ text = 'Supercity', size = 22, color = brand.chalk }: { text?: string; size?: number; color?: string }) {
  const period = 1200 + text.length * 70;
  const t = useLoop(period);
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={text}>
      {text.split('').map((ch, i) => {
        const a = (i * 70) / period;
        return (
          <Animated.Text
            key={i}
            style={{
              fontFamily: 'Poppins_800ExtraBold',
              fontWeight: '800',
              fontSize: size,
              color,
              transform: [
                {
                  translateY: t.interpolate({
                    inputRange: [0, a + 0.001, a + 0.15, a + 0.3, 1],
                    outputRange: [0, 0, -size * 0.3, 0, 0],
                  }),
                },
              ],
            }}
          >
            {ch}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// Écran de chargement plein écran, sur le dégradé orange.
export function Splash() {
  return (
    <Gradient style={st.splash}>
      <BallLoader />
      <WaveWord />
    </Gradient>
  );
}

// Lignes de terrain qui se tracent (décor des en-têtes).
export function PitchLines({ width = 260, height = 160, opacity = 0.35, draw = true }: { width?: number; height?: number; opacity?: number; draw?: boolean }) {
  const p = useRef(new Animated.Value(draw ? 0 : 1)).current;
  useEffect(() => {
    if (!draw) return;
    Animated.timing(p, { toValue: 1, duration: 2400, delay: 200, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: false }).start();
  }, [p, draw]);
  const per = 1000;
  const off = p.interpolate({ inputRange: [0, 1], outputRange: [per, 0] });
  const props = { stroke: brand.chalk, strokeWidth: 2, fill: 'none', strokeDasharray: `${per}`, strokeDashoffset: off } as const;
  return (
    <Svg width={width} height={height} viewBox="0 0 260 160" style={{ opacity }} pointerEvents="none">
      <AnimatedRect x={4} y={4} width={252} height={152} rx={6} {...props} />
      <AnimatedLine x1={130} y1={4} x2={130} y2={156} {...props} />
      <AnimatedCircle cx={130} cy={80} r={28} {...props} />
      <AnimatedRect x={4} y={44} width={40} height={72} {...props} />
      <AnimatedRect x={216} y={44} width={40} height={72} {...props} />
    </Svg>
  );
}
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// Apparition en fondu et glissé, décalée selon l'index (comme les révélations au scroll du site).
export function FadeIn({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 650,
      delay: Math.min(index, 8) * 70,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: native,
    }).start();
  }, [v, index]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Grand en-tête dégradé avec sur-titre, titre et lignes de terrain.
export function Hero({
  kicker,
  title,
  sub,
  children,
  tone,
  colors,
  kickerColor,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  children?: ReactNode;
  tone?: AccentName;
  colors?: readonly [string, string, ...string[]];
  kickerColor?: string;
}) {
  return (
    <Gradient style={st.hero} tone={tone} colors={colors}>
      <View style={st.heroPitch}>
        <PitchLines width={300} height={185} opacity={0.22} />
      </View>
      {kicker ? <Text style={[st.heroKicker, kickerColor ? { color: kickerColor } : null]}>{kicker}</Text> : null}
      {title ? <Text style={st.heroTitle}>{title}</Text> : null}
      {sub ? <Text style={st.heroSub}>{sub}</Text> : null}
      {children}
    </Gradient>
  );
}

const st = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  hero: { borderRadius: 24, padding: 22, paddingTop: 26, overflow: 'hidden', gap: 6 },
  heroPitch: { position: 'absolute', right: -70, top: -20, transform: [{ rotate: '-12deg' }] },
  heroKicker: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: brand.night },
  heroTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, lineHeight: 34, color: brand.chalk, letterSpacing: -0.5 },
  heroSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20, color: brand.chalk, opacity: 0.92 },
});
