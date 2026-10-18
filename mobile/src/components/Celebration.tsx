// Moments de fête : pluie de confettis, bandeau « C'est validé » et vibration de réussite, par-dessus tout l'écran.
// N'importe quel écran appelle celebrate({ title, text }) après une action réussie (inscription, achat, grade...).
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';

type Party = { title: string; text?: string; icon?: React.ComponentProps<typeof Ionicons>['name'] };
let show: ((p: Party) => void) | null = null;

export function celebrate(p: Party) {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  show?.(p);
}

// Animations JS sur le web (pas de pilote natif), natives ailleurs.
const native = typeof document === 'undefined';
const COLORS = [brand.orange1, brand.orange2, '#ffd54f', brand.chalk, '#2e9d4f', '#29b6f6'];
const PIECES = 42;

function Confetti({ seed, width, height }: { seed: number; width: number; height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  // Chaque morceau part du haut, à une place, une vitesse et une rotation au hasard.
  const p = useRef(
    Array.from({ length: PIECES }, (_, i) => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 140,
      delay: Math.random() * 0.25,
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
      color: COLORS[i % COLORS.length],
      w: 7 + Math.random() * 6,
      round: Math.random() > 0.7,
    }))
  ).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [seed, v]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {p.map((c, i) => {
        const t = v.interpolate({ inputRange: [0, c.delay, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: c.x,
              top: -20,
              width: c.w,
              height: c.round ? c.w : c.w * 1.6,
              borderRadius: c.round ? c.w / 2 : 2,
              backgroundColor: c.color,
              opacity: v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.85] }) },
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, c.drift] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${c.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** À monter une fois, au-dessus de la navigation. */
export function CelebrationHost() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [party, setParty] = useState<(Party & { seed: number }) | null>(null);
  const toast = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    show = (p) => {
      if (timer.current) clearTimeout(timer.current);
      setParty({ ...p, seed: Date.now() });
      toast.setValue(0);
      Animated.spring(toast, { toValue: 1, friction: 6, tension: 80, useNativeDriver: native }).start();
      timer.current = setTimeout(() => {
        Animated.timing(toast, { toValue: 0, duration: 250, useNativeDriver: native }).start(() => setParty(null));
      }, 2600);
    };
    return () => {
      show = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  if (!party) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Confetti seed={party.seed} width={width} height={height} />
      <Animated.View
        style={[
          st.toast,
          { top: insets.top + 12 },
          { opacity: toast, transform: [{ translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }, { scale: toast.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
        ]}
      >
        <View style={st.icon}>
          <Ionicons name={party.icon ?? 'checkmark'} size={20} color={brand.night} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{party.title}</Text>
          {party.text ? <Text style={st.text}>{party.text}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.night,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.orange1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: brand.chalk },
  text: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: brand.chalk, opacity: 0.85 },
});
