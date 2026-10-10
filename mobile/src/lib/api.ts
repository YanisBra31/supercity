// Client de l'API Supercity (voir docs/API.md à la racine du dépôt).
import Constants from 'expo-constants';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string) ?? 'https://supercity.fr/api/v1';

export type Format = 'city5' | 'futsal' | 'foot8' | 'foot11';
export type Position = 'gardien' | 'defenseur' | 'milieu' | 'attaquant';
export type Foot = 'droit' | 'gauche' | 'les_deux';
export type Surface = 'city' | 'synthetique' | 'herbe' | 'parquet' | 'autre';

export type PublicUser = {
  id: number;
  display_name: string;
  city: string | null;
  position: Position | null;
  level: number | null;
  strong_foot: Foot | null;
  avatar_url: string | null;
};
export type Me = PublicUser & { email: string; created_at: string };

export type Team = {
  id: number;
  name: string;
  city: string | null;
  logo_url: string | null;
  usual_format: Format | null;
  captain_id: number;
  members_count: number;
  my_role: 'captain' | 'player' | null;
  invite_code?: string;
  members?: (PublicUser & { role: 'captain' | 'player'; joined_at: string })[];
};

export type Venue = {
  id: number;
  name: string;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
  surface: Surface;
  covered: boolean;
  distance_km: number | null;
};

export type Match = {
  id: number;
  format: Format;
  starts_at: string;
  duration_min: number;
  max_players: number;
  players_count: number;
  waitlist_count: number;
  spots_left: number;
  level: number | null;
  status: 'open' | 'full' | 'cancelled' | 'played';
  visibility: 'public' | 'private';
  description: string | null;
  venue: Venue;
  organizer: PublicUser;
  home_team: { id: number; name: string; logo_url: string | null } | null;
  away_team: { id: number; name: string; logo_url: string | null } | null;
  my_status: 'registered' | 'waitlist' | 'withdrawn' | null;
  is_organizer: boolean;
  players?: (PublicUser & { status: 'registered' | 'waitlist'; team_id: number | null })[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {}
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null) {
  token = t;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export async function api<T>(method: string, path: string, opts: { body?: unknown; query?: Query } = {}): Promise<T> {
  const qs = opts.query
    ? Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Pas de connexion. Vérifie ton réseau et réessaie.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(
      res.status,
      data?.error ?? 'unknown',
      data?.message ?? 'Une erreur est survenue, réessaie.',
      data?.fields ?? {}
    );
  }
  return data as T;
}

export const get = <T>(path: string, query?: Query) => api<T>('GET', path, { query });
export const post = <T>(path: string, body?: unknown) => api<T>('POST', path, { body: body ?? {} });
export const patch = <T>(path: string, body: unknown) => api<T>('PATCH', path, { body });
export const del = <T>(path: string) => api<T>('DELETE', path);
