// Grade et carte joueur dans un seul encart : on glisse (ou on touche l'onglet) pour passer de l'un à l'autre.
// Le grade s'affiche d'abord ; la carte se retourne à chaque fois qu'on y arrive. La hauteur suit la page affichée.
import { ReactNode, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font } from './ui';

export function ProfileCards({ pages }: { pages: { title: string; render: (visit: number) => ReactNode }[] }) {
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [visits, setVisits] = useState<number[]>(() => pages.map(() => 0));
  const x = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);

  const shown = pages.length;
  if (shown === 0) return null;
  if (shown === 1) return <>{pages[0].render(0)}</>;

  const go = (i: number) => scroll.current?.scrollTo({ x: i * width, animated: true });
  const settle = (i: number) => {
    if (i === page) return;
    setPage(i);
    setVisits((v) => v.map((n, k) => (k === i ? n + 1 : n)));
  };
  const measured = width > 0 && heights.length === shown && heights.every((h) => h > 0);
  const height = measured
    ? x.interpolate({ inputRange: pages.map((_, i) => i * width), outputRange: heights, extrapolate: 'clamp' })
    : undefined;

  return (
    <View style={{ gap: 10 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={st.tabs} accessibilityRole="tablist">
        {pages.map((p, i) => (
          <Pressable key={p.title} onPress={() => go(i)} accessibilityRole="tab" accessibilityState={{ selected: page === i }} style={st.tab}>
            <Text style={[st.tabText, page === i && st.tabOn]}>{p.title}</Text>
            <Animated.View
              style={[
                st.bar,
                { opacity: width ? x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }) : i === 0 ? 1 : 0 },
              ]}
            />
          </Pressable>
        ))}
      </View>
      {width ? (
        <Animated.View style={{ height, overflow: 'hidden' }}>
          <Animated.ScrollView
            ref={scroll as never}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })}
            onMomentumScrollEnd={(e) => settle(Math.round(e.nativeEvent.contentOffset.x / width))}
            onScrollEndDrag={(e) => {
              // Sur le web, pas de fin d'inertie : on se cale à la fin du glissé.
              if (typeof document !== 'undefined') settle(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {pages.map((p, i) => (
              <View key={p.title} style={{ width, alignSelf: 'flex-start' }}>
                <View
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    setHeights((prev) => {
                      const next = [...prev];
                      next[i] = h;
                      return next.length === shown && next.every((v, k) => v === prev[k]) ? prev : next;
                    });
                  }}
                >
                  {p.render(visits[i])}
                </View>
              </View>
            ))}
          </Animated.ScrollView>
        </Animated.View>
      ) : null}
      <View style={st.dots}>
        {pages.map((p, i) => (
          <View key={p.title} style={[st.dot, page === i && st.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 22, paddingHorizontal: 4 },
  tab: { gap: 5 },
  tabText: { ...font.bold, fontSize: 15, color: colors.dim },
  tabOn: { color: colors.ink },
  bar: { height: 3, borderRadius: 2, backgroundColor: colors.orange2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 20, backgroundColor: colors.orange2 },
});
