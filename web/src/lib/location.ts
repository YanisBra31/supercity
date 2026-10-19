// Position du joueur (demandée au navigateur une fois) et lieu de recherche choisi à la main.
import type { Place } from './address';
import { loadItem, saveItem } from './storage';

export type Coords = { lat: number; lng: number };
let cached: Coords | null = null;

export function getPosition(): Promise<Coords | null> {
  if (cached) return Promise.resolve(cached);
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    // Le délai du navigateur ne court qu'une fois l'accès accordé : si le joueur laisse la demande ouverte,
    // on n'attend pas plus de 6 s pour afficher les matchs sans position.
    const giveUp = setTimeout(() => resolve(null), 6000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(giveUp);
        cached = { lat: p.coords.latitude, lng: p.coords.longitude };
        resolve(cached);
      },
      () => {
        clearTimeout(giveUp);
        resolve(null);
      },
      { maximumAge: 10 * 60 * 1000, timeout: 10000 }
    );
  });
}

const PLACE_KEY = 'supercity_search_place';

export function getSearchPlace(): Place | null {
  try {
    const raw = loadItem(PLACE_KEY);
    return raw ? (JSON.parse(raw) as Place) : null;
  } catch {
    return null;
  }
}

export function setSearchPlace(p: Place | null) {
  saveItem(PLACE_KEY, p ? JSON.stringify(p) : null);
}

/** Centre de recherche : le lieu choisi, sinon la position du navigateur. */
export async function getSearchCenter(): Promise<{ coords: Coords | null; place: Place | null }> {
  const p = getSearchPlace();
  if (p) return { coords: { lat: p.lat, lng: p.lng }, place: p };
  return { coords: await getPosition(), place: null };
}
