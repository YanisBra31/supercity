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
  bio: string | null;
  shirt_number: number | null;
  favorite_club: string | null;
  accent: Accent;
  // Absent si l'API en ligne est plus ancienne que l'appli.
  grade?: Grade;
  site_role?: Role;
};
export type Role = 'user' | 'moderator' | 'admin';
export type Grade = {
  key: 'rookie' | 'espoir' | 'titulaire' | 'cadre' | 'star' | 'legende';
  label: string;
  level: number;
  points: number;
  min: number;
  next_label: string | null;
  next_at: number | null;
};
export type Accent = 'orange' | 'nuit' | 'rouge' | 'bleu' | 'vert' | 'violet';
export type PublicProfile = PublicUser & {
  stats: { played: number; organized: number; wins?: number };
  teams: { id: number; name: string; logo_url: string | null; color_primary: string; color_secondary: string; role: 'captain' | 'player' }[];
  member_since: string;
};
export type Me = PublicUser & {
  email: string;
  email_verified: boolean;
  birth_date: string | null;
  created_at: string;
  suspended_until?: string | null;
  suspended_reason?: string | null;
};

export type Team = {
  id: number;
  name: string;
  city: string | null;
  logo_url: string | null;
  description: string | null;
  color_primary: string;
  color_secondary: string;
  founded_year: number | null;
  recruiting: boolean;
  usual_format: Format | null;
  captain_id: number;
  members_count: number;
  my_role: 'captain' | 'player' | null;
  invite_code?: string;
  members?: (PublicUser & { role: 'captain' | 'player'; joined_at: string })[];
  // Absent si l'API en ligne est plus ancienne que l'appli.
  streak?: Streak;
};

/** Série de victoires d'une équipe : en cours, meilleure, et forme sur les 5 derniers matchs (V, N, D). */
export type Streak = { current: number; best: number; on_fire: boolean; form: ('W' | 'D' | 'L')[] };

/** Roi du terrain : l'équipe avec la plus longue série de victoires en cours sur ce terrain. */
export type VenueKing = { team: TeamBrief; streak: number; on_fire: boolean };

/** Score d'un match entre deux équipes, donné par les capitaines. */
export type MatchScore = {
  home: number | null;
  away: number | null;
  status: 'reported' | 'confirmed' | 'disputed' | null;
  reported_by_team_id: number | null;
  /** Équipe gagnante, 0 pour un nul, null tant que le score n'est pas validé. */
  winner_team_id: number | null;
  can_report: boolean;
  can_confirm: boolean;
};

/** Événement bonus créé par la modération : points multipliés et/ou points en plus par match joué. */
export type BonusEvent = {
  id: number;
  title: string;
  description: string | null;
  multiplier: number;
  bonus_points: number;
  venue: Venue | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
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
  king?: VenueKing | null;
};

export type Match = {
  id: number;
  kind: 'match' | 'tournament';
  /** Nom du tournoi ou de l'événement (espace pro). */
  title: string | null;
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
  /** Espace pro qui publie le match, s'il y en a un. */
  organization: OrgSummary | null;
  home_team: MatchTeam | null;
  away_team: MatchTeam | null;
  my_status: 'registered' | 'waitlist' | 'withdrawn' | 'pending' | null;
  /** Place réservée en attendant le paiement, jusqu'à cette date. */
  my_hold_until: string | null;
  my_paid: boolean;
  /** Prix de la place en centimes (0 : gratuit), hors frais de service. */
  price_cents: number;
  fee_cents: number;
  is_organizer: boolean;
  /** Ce que l'organisation touche par place, commission Supercity déduite (organisateur seulement). */
  payout_cents: number | null;
  players?: (PublicUser & { status: 'registered' | 'waitlist'; team_id: number | null })[];
  score?: MatchScore | null;
  bonus?: BonusEvent | null;
};

/** Réponse d'inscription ou de désistement d'un match. */
export type JoinResult = Match & { checkout_url?: string | null; refunded_cents?: number | null };

export type OrgKind = 'five' | 'club' | 'association' | 'coach' | 'autre';
export type LegalForm = 'company' | 'non_profit' | 'individual';
export type OrgSummary = { id: number; name: string; kind: OrgKind; city: string | null; description: string | null };

/** Paiements d'un espace pro (compte Stripe relié). */
export type Payouts = { enabled: boolean; connected: boolean; ready: boolean; fee_cents: number; commission_percent: number; refund_hours: number };

/** Mon espace pro : paiements et chiffres. */
export type MyOrganization = OrgSummary & {
  legal_form: LegalForm;
  payouts: Payouts;
  stats: { upcoming: number; places_sold: number; gross_cents: number; commission_cents: number; net_cents: number };
};

export type MatchTeam = { id: number; name: string; logo_url: string | null; color_primary: string; color_secondary: string; streak?: number };

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
  const form = opts.body instanceof FormData;
  try {
    res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : form ? (opts.body as FormData) : JSON.stringify(opts.body),
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

// Envoie une image choisie dans la galerie (champ `photo`).
type UploadImage = { uri: string; mimeType?: string | null; fileName?: string | null; base64?: string };

// L'image part en base64 dans du JSON quand on l'a (photos converties par l'appli) : le multipart
// échoue sur certains téléphones et hébergeurs (« Pas de connexion »).
export async function uploadImage<T>(path: string, image: UploadImage): Promise<T> {
  if (image.base64) return api<T>('POST', path, { body: { photo_base64: image.base64 } });
  const body = new FormData();
  const type = image.mimeType ?? 'image/jpeg';
  const name = image.fileName ?? `photo.${type.split('/')[1] ?? 'jpg'}`;
  if (typeof document !== 'undefined') {
    // Web : l'image est une adresse blob/data, on la transforme en fichier.
    body.append('photo', await (await fetch(image.uri)).blob(), name);
  } else {
    body.append('photo', { uri: image.uri, name, type } as unknown as Blob);
  }
  return api<T>('POST', path, { body });
}

export type TeamBrief = { id: number; name: string; logo_url: string | null; color_primary: string; color_secondary: string; city: string | null };

export type Challenge = {
  id: number;
  from_team: TeamBrief;
  to_team: TeamBrief;
  created_by: PublicUser | null;
  match_id: number | null;
  starts_at: string | null;
  duration_min: number;
  format: Format | null;
  venue: Venue | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  response_message: string | null;
  created_at: string;
  responded_at: string | null;
  can_respond: boolean;
  can_cancel: boolean;
};

export type Rival = { team: TeamBrief; match_id: number; starts_at: string };

export type Post = {
  id: number;
  kind: 'post' | 'challenge';
  author: PublicUser;
  body: string | null;
  image_url: string | null;
  team: TeamBrief | null;
  match: Match | null;
  likes_count: number;
  comments_count: number;
  liked: boolean;
  is_mine: boolean;
  can_delete?: boolean;
  created_at: string;
};

export type ModReport = { post: Post; reports: number; reasons: string[]; hidden: boolean };
export type ModUser = PublicUser & { email: string };

export type Comment = { id: number; author: PublicUser; body: string; created_at: string; can_delete: boolean };

// Publier : JSON (photo en base64 si l'appli l'a convertie), multipart sinon.
export async function createPost(data: { body: string; team_id: number | null }, image?: UploadImage | null): Promise<Post> {
  if (!image || image.base64) return post<Post>('/posts', { body: data.body || null, team_id: data.team_id, photo_base64: image?.base64 });
  const form = new FormData();
  if (data.body) form.append('body', data.body);
  if (data.team_id) form.append('team_id', String(data.team_id));
  const type = image.mimeType ?? 'image/jpeg';
  const name = image.fileName ?? 'photo.jpg';
  if (typeof document !== 'undefined') form.append('photo', await (await fetch(image.uri)).blob(), name);
  else form.append('photo', { uri: image.uri, name, type } as unknown as Blob);
  return api<Post>('POST', '/posts', { body: form });
}
