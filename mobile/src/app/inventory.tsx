// Inventaire : tout ce que le joueur possède, rangé par type. Un toucher équipe l'objet, un autre le retire.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Hero } from '../components/brand';
import { BannerPattern, bannerColors, CoinAmount, CosmeticThumb, FramedAvatar, RarityTag, RARITY, TitleTag } from '../components/Cosmetics';
import { GradeBadge } from '../components/Grade';
import { Button, colors, Empty, ErrorText, font, Kicker, Loading, s, Screen } from '../components/ui';
import { ApiError, Cosmetic, CosmeticType, get, Me, patch, Shop } from '../lib/api';
import { useAuth } from '../lib/auth';

const SECTIONS: { type: CosmeticType; title: string }[] = [
  { type: 'frame', title: 'Cadres photo' },
  { type: 'banner', title: 'Bannières' },
  { type: 'title', title: 'Titres' },
];

export default function Inventory() {
  const { user, setUser } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      get<Shop>('/shop')
        .then(setShop)
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Inventaire indisponible.'));
    }, [])
  );

  if (!user) return null;
  if (!shop) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  const owned = shop.items.filter((i) => i.owned);
  const toggle = async (i: Cosmetic) => {
    setBusy(i.id);
    setError('');
    try {
      setShop(await patch<Shop>('/me/cosmetics', { [i.type]: i.equipped ? null : i.id }));
      get<Me>('/me').then(setUser).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Hero title="" colors={bannerColors(shop.equipped.banner)} tone={user.accent} kicker="Ce que les autres voient" kickerColor={colors.chalk}>
        <BannerPattern banner={shop.equipped.banner} />
        <View style={[s.row, { gap: 14 }]}>
          <FramedAvatar frame={shop.equipped.frame} name={user.display_name} uri={user.avatar_url} size={74} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={st.name} numberOfLines={1}>
              {user.display_name}
            </Text>
            <TitleTag title={shop.equipped.title} />
            <GradeBadge grade={user.grade} />
          </View>
        </View>
      </Hero>

      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={st.count}>
          {owned.length} objet{owned.length > 1 ? 's' : ''}
        </Text>
        <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" style={[s.row, { gap: 8 }]}>
          <CoinAmount n={shop.coins} size={16} />
          <Text style={st.shop}>Boutique</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.orange2} />
        </Pressable>
      </View>
      <ErrorText>{error}</ErrorText>

      {!owned.length ? (
        <Empty
          icon="sparkles-outline"
          title="Ton inventaire est vide"
          text="Gagne des pièces en jouant et offre-toi un cadre, une bannière ou un titre."
          action={{ title: 'Aller à la boutique', icon: 'bag-handle-outline', onPress: () => router.push('/shop') }}
        />
      ) : (
        <Text style={s.sub}>Touche un objet pour le porter, touche-le encore pour le retirer.</Text>
      )}

      {SECTIONS.map(({ type, title }) => {
        const items = owned.filter((i) => i.type === type);
        return items.length ? (
          <View key={type} style={{ gap: 10 }}>
            <Kicker>{title}</Kicker>
            <View style={st.grid}>
              {items.map((i) => (
                <Pressable
                  key={i.id}
                  onPress={() => toggle(i)}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i.equipped, busy: busy === i.id }}
                  accessibilityLabel={`${i.name}, ${i.equipped ? 'porté, toucher pour retirer' : 'toucher pour porter'}`}
                  style={({ pressed }) => [
                    st.tile,
                    { borderColor: i.equipped ? RARITY[i.rarity].color : colors.line },
                    i.equipped && st.tileOn,
                    (pressed || busy === i.id) && { transform: [{ scale: 0.97 }], opacity: 0.8 },
                  ]}
                >
                  <CosmeticThumb item={i} name={user.display_name} uri={user.avatar_url} />
                  <Text style={st.tileName} numberOfLines={1}>
                    {i.name}
                  </Text>
                  <View style={[s.row, { justifyContent: 'space-between', gap: 4 }]}>
                    <RarityTag rarity={i.rarity} small />
                    {i.equipped ? (
                      <View style={[s.row, { gap: 3 }]}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={st.worn}>Porté</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null;
      })}
      {owned.length ? <Button title="Voir la boutique" variant="ghost" icon="bag-handle-outline" onPress={() => router.push('/shop')} /> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  name: { ...font.extrabold, fontSize: 22, lineHeight: 28, color: colors.chalk },
  count: { ...font.bold, fontSize: 15, color: colors.ink },
  shop: { ...font.semibold, fontSize: 14, color: colors.orange2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, maxWidth: '50%', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1.5, padding: 10, gap: 6 },
  tileOn: { backgroundColor: colors.tint, borderWidth: 2.5 },
  tileName: { ...font.bold, fontSize: 13.5, color: colors.ink },
  worn: { ...font.bold, fontSize: 12, color: colors.success },
});
