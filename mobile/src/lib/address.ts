// Recherche d'adresses, de villes et de lieux nommés (stades, gymnases, parcs) en France, via la Géoplateforme de l'IGN
// (service public gratuit, sans clé) : la Base Adresse Nationale pour les adresses, la BD TOPO pour les lieux.
// Tout passe par ce fichier : changer de fournisseur (Google Places…) ne touche rien d'autre.
import { Coords } from './location';

export type Place = Coords & {
  label: string; // « 12 Rue des Lilas 31100 Toulouse »
  name: string; // « 12 Rue des Lilas »
  city: string | null;
  postcode: string | null;
  kind: 'housenumber' | 'street' | 'locality' | 'municipality' | 'poi';
  /** Pour un lieu nommé : sa catégorie (« stade », « gymnase »...). */
  category?: string | null;
};

const URL = 'https://data.geopf.fr/geocodage/search';

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { label: string; name: string; city?: string; postcode?: string; type: Place['kind'] };
};

/** Suggestions pour une saisie partielle ; les plus proches de `near` d'abord. Vide si moins de 3 caractères. */
export async function searchAddress(q: string, near?: Coords | null, signal?: AbortSignal): Promise<Place[]> {
  const text = q.trim();
  if (text.length < 3) return [];
  const params = new URLSearchParams({ q: text, limit: '6', autocomplete: '1', index: 'address' });
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lon', String(near.lng));
  }
  const res = await fetch(`${URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`geocodage ${res.status}`);
  const data = (await res.json()) as { features?: Feature[] };
  return (data.features ?? []).map((f) => ({
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    label: f.properties.label,
    name: f.properties.name,
    city: f.properties.city ?? null,
    postcode: f.properties.postcode ?? null,
    kind: f.properties.type,
  }));
}

type PoiFeature = {
  geometry: { coordinates: [number, number] };
  properties: { toponym?: string; name?: string | string[]; category?: string | string[]; city?: string | string[]; postcode?: string | string[] };
};

const first = (v: string | string[] | undefined): string | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
// Lieux de sport en tête des suggestions.
const SPORT = /stade|sport|gymnase|terrain|foot|five|futsal|complexe|salle|arena|city/i;

/** Lieux nommés (« Parc des Princes », « Gymnase Bellevue ») pour une saisie partielle. */
export async function searchPoi(q: string, near?: Coords | null, signal?: AbortSignal): Promise<Place[]> {
  const text = q.trim();
  if (text.length < 3) return [];
  const params = new URLSearchParams({ q: text, limit: '8', index: 'poi' });
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lon', String(near.lng));
  }
  const res = await fetch(`${URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`geocodage poi ${res.status}`);
  const data = (await res.json()) as { features?: PoiFeature[] };
  return (data.features ?? [])
    .map((f) => {
      const name = f.properties.toponym ?? first(f.properties.name) ?? '';
      const city = first(f.properties.city);
      const postcode = first(f.properties.postcode);
      const categories = Array.isArray(f.properties.category) ? f.properties.category : f.properties.category ? [f.properties.category] : [];
      const category = categories.find((c) => SPORT.test(c)) ?? categories[0] ?? null;
      return {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        label: [name, [postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        name,
        city,
        postcode,
        kind: 'poi' as const,
        category,
      };
    })
    .filter((p) => p.name)
    .sort((a, b) => Number(SPORT.test(`${b.name} ${b.category ?? ''}`)) - Number(SPORT.test(`${a.name} ${a.category ?? ''}`)));
}

/** Lieux nommés d'abord, puis adresses : on trouve un terrain par son nom ou par son adresse. */
export async function searchPlaces(q: string, near?: Coords | null, signal?: AbortSignal): Promise<Place[]> {
  const [pois, addresses] = await Promise.allSettled([searchPoi(q, near, signal), searchAddress(q, near, signal)]);
  const a = pois.status === 'fulfilled' ? pois.value.slice(0, 5) : [];
  const b = addresses.status === 'fulfilled' ? addresses.value.slice(0, 4) : [];
  if (pois.status === 'rejected' && addresses.status === 'rejected') throw addresses.reason;
  return [...a, ...b];
}
