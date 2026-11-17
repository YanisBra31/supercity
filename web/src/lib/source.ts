// D'où vient un joueur arrivé par la page publique d'un match (supercity.fr/m/12?src=tiktok) : la source est gardée
// sur son téléphone jusqu'à son inscription au match, pour compter ce que rapporte chaque réseau. Rien d'autre n'est gardé.
import { loadItem, saveItem } from './storage';

const KEY = 'sc_from';
const DAYS = 7;

type From = { match: number; src: string; at: number };

/** À l'ouverture de l'appli : /app/register?next=/match/12&src=tiktok. */
export function captureSource(): void {
  const q = new URLSearchParams(location.search);
  const src = q.get('src');
  const match = /^\/match\/(\d+)/.exec(q.get('next') ?? '');
  if (src && match && /^[A-Za-z0-9_-]{1,24}$/.test(src)) saveItem(KEY, JSON.stringify({ match: Number(match[1]), src: src.toLowerCase(), at: Date.now() }));
}

function current(): From | null {
  try {
    const f = JSON.parse(loadItem(KEY) ?? 'null') as From | null;
    return f && Date.now() - f.at < DAYS * 864e5 ? f : null;
  } catch {
    return null;
  }
}

/** Pour la création du compte : { from_match, src }, ou rien. */
export function signupSource(): { from_match?: number; src?: string } {
  const f = current();
  return f ? { from_match: f.match, src: f.src } : {};
}

/** Pour l'inscription à ce match : { src }, ou rien. */
export function joinSource(matchId: number): { src?: string } {
  const f = current();
  return f && f.match === matchId ? { src: f.src } : {};
}

export function clearSource(): void {
  saveItem(KEY, null);
}
