// Recherche des matchs autour du joueur.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hero } from '../../components/brand';
import { MatchCard } from '../../components/MatchCard';
import { Chips, colors, Empty, ErrorText, Label, s } from '../../components/ui';
import { ApiError, Format, get, Match } from '../../lib/api';
import { FORMATS } from '../../lib/format';
import { Coords, getPosition } from '../../lib/location';

const RADII = [5, 15, 30, 60];

export default function Matches() {
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useState<Format | null>(null);
  const [radius, setRadius] = useState(15);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [items, setItems] = useState<Match[] | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const pos = await getPosition();
      setCoords(pos);
      const res = await get<{ items: Match[] }>('/matches', {
        lat: pos?.lat,
        lng: pos?.lng,
        radius_km: pos ? radius : undefined,
        format: format ?? undefined,
        spots: onlyOpen ? 1 : undefined,
        limit: 50,
      });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger les matchs.');
      setItems((prev) => prev ?? []);
    }
  }, [format, radius, onlyOpen]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }}
      data={items ?? []}
      keyExtractor={(m) => String(m.id)}
      renderItem={({ item, index }) => <MatchCard match={item} index={index} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange2} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Hero
            kicker="Près de chez toi"
            title="Les matchs autour de toi"
            sub={items ? `${items.length} match${items.length > 1 ? 's' : ''} à rejoindre` : 'Recherche des terrains…'}
          />
          <Label>Format</Label>
          <Chips
            options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
            value={format}
            onChange={setFormat}
            allowEmpty
          />
          <Label>Rayon</Label>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {coords ? (
              <Chips options={RADII.map((r) => ({ value: r, label: `${r} km` }))} value={radius} onChange={(v) => v && setRadius(v)} />
            ) : (
              <Text style={s.sub}>Active la localisation pour voir les matchs autour de toi.</Text>
            )}
          </View>
          <Chips options={[{ value: 'open', label: 'Places libres uniquement' }]} value={onlyOpen ? 'open' : null} onChange={(v) => setOnlyOpen(!!v)} allowEmpty />
          <ErrorText>{error}</ErrorText>
        </View>
      }
      ListEmptyComponent={
        items === null ? null : (
          <Empty icon="football-outline" title="Aucun match pour l'instant" text="Élargis la zone, ou organise le premier match du coin." />
        )
      }
    />
  );
}
