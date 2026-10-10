// Recherche d'adresses et de villes françaises (Base Adresse Nationale, service public gratuit, sans clé).
// Tout passe par ce fichier : changer de fournisseur (Google Places…) ne touche rien d'autre.
import { Coords } from './location';

export type Place = Coords & {
  label: string; // « 12 Rue des Lilas 31100 Toulouse »
  name: string; // « 12 Rue des Lilas »
  city: string | null;
  postcode: string | null;
  kind: 'housenumber' | 'street' | 'locality' | 'municipality';
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
