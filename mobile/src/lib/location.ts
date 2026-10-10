// Position du joueur, demandée une fois puis gardée en mémoire.
import * as Location from 'expo-location';

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
