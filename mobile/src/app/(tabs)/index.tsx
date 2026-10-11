// Recherche des matchs autour du joueur, en liste ou sur la carte.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hero } from '../../components/brand';
import { MatchCard } from '../../components/MatchCard';
import { PlaceButton, PlaceSheet } from '../../components/AddressSearch';
import { ActiveFilters, activeCount, DEFAULT_FILTERS, FilterButton, Filters, FilterSheet, whenRange, WhenBar } from '../../components/MatchFilters';
import { MatchMap } from '../../components/MatchMap';
import { Banner, colors, Empty, ErrorText, font } from '../../components/ui';
import { ApiError, BonusEvent, get, Match, Venue } from '../../lib/api';
import { BonusBanner } from '../../components/Streak';
import { useAuth } from '../../lib/auth';
import { Place } from '../../lib/address';
import { Coords, getSearchCenter, setSearchPlace } from '../../lib/location';

type View_ = 'list' | 'map';

export default function Matches() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<View_>('list');
  const [sheet, setSheet] = useState(false);
  const [placeSheet, setPlaceSheet] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [items, setItems] = useState<Match[] | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { coords: pos, place: p } = await getSearchCenter();
      setCoords(pos);
      setPlace(p);
      const geo = pos ? { lat: pos.lat, lng: pos.lng, radius_km: filters.radius } : {};
      const res = await get<{ items: Match[] }>('/matches', {
        ...geo,
        ...whenRange(filters.when),
        format: filters.format ?? undefined,
        level: filters.level ?? undefined,
        spots: filters.onlyOpen ? 1 : undefined,
        sort: pos && filters.sort === 'date' ? 'date' : undefined,
        limit: 50,
      });
      setItems(res.items);
      get<{ items: BonusEvent[] }>('/bonus-events').then((r) => setEvents(r.items.slice(0, 2))).catch(() => setEvents([]));
      // Les terrains sans match apparaissent aussi sur la carte.
      if (pos) get<{ items: Venue[] }>('/venues', { ...geo, limit: 100 }).then((r) => setVenues(r.items)).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger les matchs.');
      setItems((prev) => prev ?? []);
    }
  }, [filters]);

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

  const count = activeCount(filters, !!coords);

  // Barre commune aux deux vues : bascule liste/carte, dates, bouton de filtres, filtres actifs.
  const controls = (
    <View style={{ gap: 12 }}>
      <View style={st.toolbar}>
        <Segmented value={view} onChange={setView} />
        <FilterButton count={count} onPress={() => setSheet(true)} />
      </View>
      <WhenBar value={filters.when} onChange={(when) => setFilters((f) => ({ ...f, when }))} />
      <ActiveFilters f={filters} hasCoords={!!coords} onChange={setFilters} />
      <PlaceButton place={place} hasCoords={!!coords} onPress={() => setPlaceSheet(true)} />
      {!coords ? (
        <View style={st.notice}>
          <Ionicons name="location-outline" size={16} color={colors.dim} />
          <Text style={st.noticeText}>Active la localisation ou choisis une ville pour voir les matchs autour.</Text>
        </View>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );

  const choosePlace = async (p: Place | null) => {
    await setSearchPlace(p);
    load();
  };
  const sheetEl = (
    <>
      <FilterSheet visible={sheet} value={filters} hasCoords={!!coords} onApply={setFilters} onClose={() => setSheet(false)} />
      <PlaceSheet visible={placeSheet} near={coords} onPick={choosePlace} onClose={() => setPlaceSheet(false)} />
    </>
  );
  const found = items ? `${items.length} match${items.length > 1 ? 's' : ''} à rejoindre` : 'Recherche des terrains…';

  if (view === 'map') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, gap: 6 }}>
          <Text style={st.mapTitle}>Carte des matchs</Text>
          <Text style={st.mapSub}>{found}</Text>
          {controls}
        </View>
        <MatchMap matches={items ?? []} venues={venues} coords={coords} radiusKm={filters.radius} />
        {sheetEl}
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }}
        data={items ?? []}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item, index }) => <MatchCard match={item} index={index} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange2} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <Hero kicker={place ? 'Trouve ton match' : 'Près de chez toi'} title={place ? `Les matchs autour de ${place.city ?? place.name}` : 'Les matchs autour de toi'} sub={found} />
            {user && !user.email_verified ? (
              <Banner icon="mail-unread-outline" title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." onPress={() => router.push('/verify')} />
            ) : null}
            {events.map((e) => (
              <BonusBanner key={e.id} event={e} />
            ))}
            {controls}
          </View>
        }
        ListEmptyComponent={
          items === null ? null : (
            <Empty
              icon="football-outline"
              title="Aucun match pour ces filtres"
              text={count || filters.when !== 'all' ? 'Retire un filtre ou élargis la zone.' : 'Élargis la zone, ou organise le premier match du coin.'}
            />
          )
        }
      />
      {sheetEl}
    </>
  );
}

function Segmented({ value, onChange }: { value: View_; onChange: (v: View_) => void }) {
  const opts: { v: View_; label: string; icon: 'list' | 'map' }[] = [
    { v: 'list', label: 'Liste', icon: 'list' },
    { v: 'map', label: 'Carte', icon: 'map' },
  ];
  return (
    <View style={st.segment} accessibilityRole="tablist">
      {opts.map((o) => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => onChange(o.v)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[st.segBtn, on && st.segOn]}>
            <Ionicons name={o.icon} size={16} color={on ? colors.chalk : colors.ink} />
            <Text style={[st.segText, on && { color: colors.chalk }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  segment: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 999, borderWidth: 1, borderColor: colors.line, padding: 3 },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 999 },
  segOn: { backgroundColor: colors.orange2 },
  segText: { ...font.semibold, fontSize: 13, color: colors.ink },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeText: { ...font.regular, fontSize: 13, color: colors.dim, flex: 1 },
  mapTitle: { ...font.extrabold, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  mapSub: { ...font.regular, fontSize: 14, color: colors.dim, marginBottom: 6 },
});
