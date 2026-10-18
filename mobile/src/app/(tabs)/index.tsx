// Recherche des matchs autour du joueur, en liste ou sur la carte.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/MatchCard';
import { PlaceButton, PlaceSheet } from '../../components/AddressSearch';
import { ActiveFilters, activeCount, DEFAULT_FILTERS, FilterButton, Filters, FilterSheet, whenRange, WhenBar } from '../../components/MatchFilters';
import { MatchMap } from '../../components/MatchMap';
import { Banner, colors, Empty, ErrorText, font, IconButton, PageHeader } from '../../components/ui';
import { ApiError, BonusEvent, get, Match, Venue } from '../../lib/api';
import { BonusBanner } from '../../components/Streak';
import { useAuth } from '../../lib/auth';
import { useBadge } from '../../lib/badge';
import { Place } from '../../lib/address';
import { Coords, getSearchCenter, setSearchPlace } from '../../lib/location';

type View_ = 'list' | 'map';

export default function Matches() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<View_>('list');
  const badge = useBadge();
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

  const found = items ? `${items.length} match${items.length > 1 ? 's' : ''} à rejoindre` : 'Recherche des terrains…';
  // En-tête commun aux deux vues : titre et bascule liste/carte, lieu et filtres, dates, filtres actifs.
  const controls = (
    <View style={{ gap: 12 }}>
      <PageHeader
        kicker="Trouve ton match"
        title="Matchs"
        sub={found}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon="notifications-outline" label="Notifications" badge={badge.unread} onPress={() => router.push('/notifications')} />
            <IconButton
              icon={view === 'list' ? 'map-outline' : 'list'}
              label={view === 'list' ? 'Voir sur la carte' : 'Voir la liste'}
              onPress={() => setView(view === 'list' ? 'map' : 'list')}
              dark
            />
          </View>
        }
      />
      <View style={st.toolbar}>
        <View style={{ flex: 1 }}>
          <PlaceButton place={place} hasCoords={!!coords} onPress={() => setPlaceSheet(true)} />
        </View>
        <FilterButton count={count} onPress={() => setSheet(true)} />
      </View>
      <WhenBar value={filters.when} onChange={(when) => setFilters((f) => ({ ...f, when }))} />
      <ActiveFilters f={filters} hasCoords={!!coords} onChange={setFilters} />
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
  if (view === 'map') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12 }}>
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
            {controls}
            {user && !user.email_verified ? (
              <Banner icon="mail-unread-outline" title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." onPress={() => router.push('/verify')} />
            ) : null}
            {events.map((e) => (
              <BonusBanner key={e.id} event={e} />
            ))}
          </View>
        }
        ListEmptyComponent={
          items === null ? null : (
            <Empty
              icon="football-outline"
              title="Aucun match pour ces filtres"
              text={count || filters.when !== 'all' ? 'Retire un filtre ou élargis la zone.' : 'Élargis la zone, ou organise le premier match du coin.'}
              action={{ title: 'Organiser un match', icon: 'add-circle', onPress: () => router.push('/create') }}
            />
          )
        }
      />
      {sheetEl}
    </>
  );
}

const st = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeText: { ...font.regular, fontSize: 13, color: colors.dim, flex: 1 },
});
