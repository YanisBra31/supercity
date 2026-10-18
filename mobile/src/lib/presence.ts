// Statut d'un ami en mots et en couleur : en match, en ligne, vu il y a...
import { colors } from '../components/ui';
import { Presence } from './api';
import { dayLabel, timeAgo, timeLabel } from './format';

export const PRESENCE_COLORS = { match: colors.orange2, online: colors.success, offline: colors.dim } as const;

export function presenceLabel(p: Presence): string {
  if (p.state === 'match' && p.match) return `En match à ${p.match.venue} · jusqu'à ${timeLabel(new Date(p.match.ends_at))}`;
  if (p.state === 'online') return 'En ligne';
  return p.last_seen_at ? `Vu ${timeAgo(p.last_seen_at)}` : 'Hors ligne';
}

/** « Joue demain à 19h00 au Five » : le prochain match, s'il en a un dans la semaine. */
export function nextMatchLabel(p: Presence): string | null {
  if (!p.next_match) return null;
  const d = new Date(p.next_match.starts_at);
  return `Joue ${dayLabel(d).toLowerCase()} à ${timeLabel(d)} · ${p.next_match.venue}`;
}
