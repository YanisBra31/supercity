// Libellés et mises en forme en français.
import { Foot, Format, Position, Surface } from './api';

export const FORMATS: { value: Format; label: string; short: string; players: number }[] = [
  { value: 'city5', label: 'City', short: '5 vs 5', players: 10 },
  { value: 'futsal', label: 'Futsal', short: '5 vs 5', players: 10 },
  { value: 'foot8', label: 'Foot à 8', short: '8 vs 8', players: 16 },
  { value: 'foot11', label: 'Foot à 11', short: '11 vs 11', players: 22 },
];
export const formatLabel = (f: Format) => FORMATS.find((x) => x.value === f)?.label ?? f;
export const formatShort = (f: Format) => FORMATS.find((x) => x.value === f)?.short ?? '';

export const POSITIONS: { value: Position; label: string }[] = [
  { value: 'gardien', label: 'Gardien' },
  { value: 'defenseur', label: 'Défenseur' },
  { value: 'milieu', label: 'Milieu' },
  { value: 'attaquant', label: 'Attaquant' },
];
export const FEET: { value: Foot; label: string }[] = [
  { value: 'droit', label: 'Droit' },
  { value: 'gauche', label: 'Gauche' },
  { value: 'les_deux', label: 'Les deux' },
];
export const SURFACES: { value: Surface; label: string }[] = [
  { value: 'city', label: 'City stade' },
  { value: 'synthetique', label: 'Synthétique' },
  { value: 'herbe', label: 'Herbe' },
  { value: 'parquet', label: 'Parquet' },
  { value: 'autre', label: 'Autre' },
];
export const surfaceLabel = (s: Surface) => SURFACES.find((x) => x.value === s)?.label ?? s;
export const LEVELS = ['Débutant', 'Loisir', 'Régulier', 'Confirmé', 'Expert'];
export const levelLabel = (l: number | null) => (l ? LEVELS[l - 1] : 'Tous niveaux');

const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dayLabel(d: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, tomorrow)) return 'Demain';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const timeLabel = (d: Date) => `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;

export function whenLabel(iso: string): string {
  const d = new Date(iso);
  return `${dayLabel(d)} · ${timeLabel(d)}`;
}

export const distanceLabel = (km: number | null) =>
  km === null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;

// « à l'instant », « il y a 5 min », « il y a 3 h », « hier », puis la date.
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 2 * 86400) return 'hier';
  if (s < 7 * 86400) return `il y a ${Math.floor(s / 86400)} jours`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
