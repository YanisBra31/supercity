// Carte des matchs et des terrains autour du joueur (téléphone). Un marqueur par terrain :
// orange avec le nombre de matchs, gris s'il n'y a pas de match prévu.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import { Match, Venue } from '../lib/api';
import { distanceLabel, formatLabel, surfaceLabel, whenLabel } from '../lib/format';
import { Coords } from '../lib/location';
import { brand, FadeIn, Gradient } from './brand';
import { colors, font } from './ui';

export type MapProps = { matches: Match[]; venues: Venue[]; coords: Coords | null; radiusKm: number };

// Centre par défaut quand la position n'est pas connue : Paris.
const PARIS = { lat: 48.8566, lng: 2.3522 };

function regionFor(c: Coords, km: number): Region {
  const latDelta = (km * 2.4) / 111;
  return { latitude: c.lat, longitude: c.lng, latitudeDelta: latDelta, longitudeDelta: latDelta / Math.cos((c.lat * Math.PI) / 180) };
}

export function MatchMap({ matches, venues, coords, radiusKm }: MapProps) {
  const map = useRef<MapView>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // Terrains de la zone, avec leurs matchs ; ceux qui n'ont que des matchs viennent aussi de la liste des matchs.
  const spots = useMemo(() => {
    const byVenue = new Map<number, { venue: Venue; matches: Match[] }>();
    for (const v of venues) byVenue.set(v.id, { venue: v, matches: [] });
    for (const m of matches) {
      const e = byVenue.get(m.venue.id) ?? { venue: m.venue, matches: [] };
      e.matches.push(m);
      byVenue.set(m.venue.id, e);
    }
    return [...byVenue.values()];
  }, [matches, venues]);

  const current = spots.find((s) => s.venue.id === selected) ?? null;
  const center = coords ?? PARIS;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={regionFor(center, coords ? radiusKm : 8)}
        showsUserLocation={!!coords}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        onPress={() => setSelected(null)}
      >
        {coords ? (
          <Circle
            center={{ latitude: coords.lat, longitude: coords.lng }}
            radius={radiusKm * 1000}
            strokeColor="rgba(255,82,35,.55)"
            fillColor="rgba(255,148,23,.08)"
            strokeWidth={2}
          />
        ) : null}
        {spots.map(({ venue, matches: ms }) => {
          const on = venue.id === selected;
          return (
            <Marker
              key={`${venue.id}-${ms.length}-${on ? 1 : 0}`}
              coordinate={{ latitude: venue.lat, longitude: venue.lng }}
              onPress={(e) => {
                e.stopPropagation();
                setSelected(venue.id);
                map.current?.animateCamera({ center: { latitude: venue.lat, longitude: venue.lng } }, { duration: 350 });
              }}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
              accessibilityLabel={`${venue.name}, ${ms.length} match${ms.length > 1 ? 's' : ''}`}
            >
              <View style={{ alignItems: 'center' }}>
                <View style={[st.pin, ms.length ? st.pinOn : st.pinOff, on && st.pinSelected]}>
                  <Text style={[st.pinText, !ms.length && { color: colors.dim }]}>{ms.length ? ms.length : '·'}</Text>
                </View>
                <View style={[st.tail, { borderTopColor: ms.length ? brand.orange2 : '#b8aca3' }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {coords ? (
        <Pressable
          onPress={() => map.current?.animateToRegion(regionFor(coords, radiusKm), 400)}
          accessibilityRole="button"
          accessibilityLabel="Recentrer sur ma position"
          style={st.locate}
        >
          <Ionicons name="locate" size={22} color={colors.ink} />
        </Pressable>
      ) : null}

      {current ? (
        <FadeIn key={current.venue.id} style={st.sheet}>
          <View style={st.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={st.venue} numberOfLines={1}>
                {current.venue.name}
              </Text>
              <Text style={st.meta} numberOfLines={1}>
                {[surfaceLabel(current.venue.surface), current.venue.covered ? 'couvert' : null, distanceLabel(current.venue.distance_km)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable onPress={() => setSelected(null)} hitSlop={10} accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={colors.dim} />
            </Pressable>
          </View>
          {current.matches.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {current.matches.map((m) => (
                <Pressable key={m.id} onPress={() => router.push(`/match/${m.id}`)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
                  <Gradient style={st.mini} tone={m.spots_left > 0 ? 'orange' : 'night'}>
                    <Text style={st.miniWhen}>{whenLabel(m.starts_at)}</Text>
                    <Text style={st.miniFormat}>{formatLabel(m.format)}</Text>
                    <Text style={st.miniSpots}>{m.spots_left > 0 ? `${m.spots_left} place${m.spots_left > 1 ? 's' : ''}` : 'Complet'}</Text>
                  </Gradient>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Pressable onPress={() => router.push('/(tabs)/create')} style={st.empty} accessibilityRole="button">
              <Ionicons name="add-circle" size={20} color={colors.orange2} />
              <Text style={st.emptyText}>Aucun match prévu ici. Organise le premier !</Text>
            </Pressable>
          )}
        </FadeIn>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  pin: { minWidth: 34, height: 34, borderRadius: 17, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  pinOn: { backgroundColor: brand.orange2 },
  pinOff: { backgroundColor: '#efe9e4', minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 0 },
  pinSelected: { backgroundColor: brand.night, transform: [{ scale: 1.15 }] },
  pinText: { ...font.extrabold, fontSize: 14, color: '#fff' },
  tail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  locate: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: colors.bg,
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  venue: { ...font.extrabold, fontSize: 17, color: colors.ink },
  meta: { ...font.regular, fontSize: 13, color: colors.dim },
  mini: { width: 150, borderRadius: 16, padding: 12, gap: 2 },
  miniWhen: { ...font.bold, fontSize: 13, color: colors.chalk },
  miniFormat: { ...font.regular, fontSize: 12.5, color: colors.chalk, opacity: 0.9 },
  miniSpots: { ...font.extrabold, fontSize: 15, color: colors.chalk, marginTop: 4 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  emptyText: { ...font.semibold, fontSize: 14, color: colors.ink, flex: 1 },
});
