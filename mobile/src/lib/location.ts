// Position du joueur, demandée une fois puis gardée en mémoire, et lieu de recherche choisi à la main.
import * as Location from 'expo-location';
import type { Place } from './address';
import { loadItem, saveItem } from './storage';

export type Coords = { lat: number; lng: number };
let cached: Coords | null = null;

export async function getPosition(): Promise<Coords | null> {
  if (cached) return cached;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync();
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    cached = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    return cached;
  } catch {
    return null;
  }
}

// Lieu autour duquel chercher les matchs et les terrains, choisi par le joueur (null : sa position).
const PLACE_KEY = 'supercity_search_place';
let place: Place | null | undefined;

export async function getSearchPlace(): Promise<Place | null> {
  if (place === undefined) {
    try {
      const raw = await loadItem(PLACE_KEY);
      place = raw ? (JSON.parse(raw) as Place) : null;
    } catch {
      place = null;
    }
  }
  return place;
}

export async function setSearchPlace(p: Place | null): Promise<void> {
  place = p;
  await saveItem(PLACE_KEY, p ? JSON.stringify(p) : null).catch(() => undefined);
}

/** Centre de recherche : le lieu choisi, sinon la position du téléphone. */
export async function getSearchCenter(): Promise<{ coords: Coords | null; place: Place | null }> {
  const p = await getSearchPlace();
  if (p) return { coords: { lat: p.lat, lng: p.lng }, place: p };
  return { coords: await getPosition(), place: null };
}
