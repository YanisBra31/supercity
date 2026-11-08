// Carte joueur en image, au format story (1080×1920), pour la poster sur Instagram, TikTok ou WhatsApp.
// Dessinée dans le navigateur : rien n'est envoyé au serveur.
import { CardStat, PlayerCard, Position } from './api';

const W = 1080;
const H = 1920;
const STATS: [CardStat, string][] = [
  ['pac', 'VIT'],
  ['sho', 'TIR'],
  ['pas', 'PAS'],
  ['dri', 'DRI'],
  ['def', 'DEF'],
  ['phy', 'PHY'],
];
const POS: Record<Position, string> = { gardien: 'GB', defenseur: 'DEF', milieu: 'MIL', attaquant: 'ATT' };

/** Mêmes paliers que la carte de l'appli : bronze, argent, or, noire. */
function tier(overall: number) {
  if (overall >= 87) return { stops: ['#3a302b', '#1f1a17'], ink: '#ffd54f', line: 'rgba(255,213,79,.35)' };
  if (overall >= 75) return { stops: ['#fff0b8', '#d9a92c'], ink: '#3b2a05', line: 'rgba(59,42,5,.2)' };
  if (overall >= 65) return { stops: ['#f4f6f8', '#a3acb4'], ink: '#23292e', line: 'rgba(35,41,46,.2)' };
  return { stops: ['#f0c79c', '#a0643a'], ink: '#3a1f0c', line: 'rgba(58,31,12,.2)' };
}

const font = (weight: number, size: number) => `${weight} ${size}px Poppins, system-ui, sans-serif`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Rectangle aux coins du haut et du bas différents (la forme de la carte). */
function shape(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: number, bottom: number) {
  c.beginPath();
  c.moveTo(x + top, y);
  c.lineTo(x + w - top, y);
  c.quadraticCurveTo(x + w, y, x + w, y + top);
  c.lineTo(x + w, y + h - bottom);
  c.quadraticCurveTo(x + w, y + h, x + w - bottom, y + h);
  c.lineTo(x + bottom, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - bottom);
  c.lineTo(x, y + top);
  c.quadraticCurveTo(x, y, x + top, y);
  c.closePath();
}

function star(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: boolean, color: string) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  c.closePath();
  c.lineWidth = 3;
  c.strokeStyle = color;
  c.fillStyle = color;
  if (filled) c.fill();
  else c.stroke();
}

function halo(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(13,10,8,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Texte réduit jusqu'à tenir dans `max` pixels. */
function fitFont(c: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number) {
  let s = size;
  c.font = font(weight, s);
  while (s > 24 && c.measureText(text).width > max) {
    s -= 2;
    c.font = font(weight, s);
  }
}

export async function cardImage(card: PlayerCard, name: string, avatarUrl: string | null, position: Position | null): Promise<Blob> {
  await Promise.all([document.fonts.load(font(800, 100)), document.fonts.load(font(600, 40))]).catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;

  // Fond nuit et halos orange, comme la vitrine.
  c.fillStyle = '#0d0a08';
  c.fillRect(0, 0, W, H);
  halo(c, W * 0.9, H * 0.05, 900, 'rgba(255,82,35,0.55)');
  halo(c, W * 0.05, H * 0.95, 800, 'rgba(255,148,23,0.35)');

  // En-tête.
  const logo = await loadImage('/logo-blanc.png');
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  if (logo) c.drawImage(logo, 90, 120, (logo.width * 70) / logo.height, 70);
  c.fillStyle = '#fff8f1';
  c.font = font(800, 46);
  c.fillText('Supercity', 90 + (logo ? (logo.width * 70) / logo.height + 20 : 0), 172);
  c.textAlign = 'center';
  c.font = font(800, 84);
  c.fillText('Ma carte joueur', W / 2, 360);

  // La carte.
  const t = tier(card.overall);
  const cw = 760;
  const ch = 1110;
  const cx = (W - cw) / 2;
  const cy = 450;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 80;
  c.shadowOffsetY = 30;
  shape(c, cx, cy, cw, ch, 180, 80);
  const g = c.createLinearGradient(cx, cy, cx + cw * 0.5, cy + ch);
  g.addColorStop(0, t.stops[0]);
  g.addColorStop(1, t.stops[1]);
  c.fillStyle = g;
  c.fill();
  c.restore();

  // Note, poste et photo.
  c.fillStyle = t.ink;
  c.textAlign = 'center';
  c.font = font(800, 150);
  c.fillText(String(card.overall), cx + 170, cy + 260);
  c.font = font(800, 56);
  c.fillText(position ? POS[position] : 'JOU', cx + 170, cy + 330);

  const ar = 150;
  const ax = cx + cw - 80 - ar;
  const ay = cy + 230;
  c.save();
  c.beginPath();
  c.arc(ax, ay, ar, 0, Math.PI * 2);
  c.closePath();
  c.clip();
  const photo = avatarUrl ? await loadImage(avatarUrl) : null;
  if (photo) {
    const s = Math.max((ar * 2) / photo.width, (ar * 2) / photo.height);
    c.drawImage(photo, ax - (photo.width * s) / 2, ay - (photo.height * s) / 2, photo.width * s, photo.height * s);
  } else {
    const ag = c.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
    ag.addColorStop(0, '#ff9417');
    ag.addColorStop(1, '#ff5223');
    c.fillStyle = ag;
    c.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    c.fillStyle = '#fff8f1';
    c.font = font(800, 140);
    c.textBaseline = 'middle';
    c.fillText((name || '?').slice(0, 1).toUpperCase(), ax, ay + 8);
    c.textBaseline = 'alphabetic';
  }
  c.restore();

  // Nom entre deux traits.
  const line = (y: number) => {
    c.strokeStyle = t.line;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + 70, y);
    c.lineTo(cx + cw - 70, y);
    c.stroke();
  };
  line(cy + 440);
  c.fillStyle = t.ink;
  fitFont(c, name.toUpperCase(), 800, 76, cw - 140);
  c.fillText(name.toUpperCase(), W / 2, cy + 530);
  line(cy + 575);

  // Six stats sur deux colonnes.
  STATS.forEach(([k, label], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = cx + (col ? cw / 2 + 60 : 110);
    const y = cy + 680 + row * 100;
    c.textAlign = 'left';
    c.font = font(800, 72);
    c.fillText(String(card.stats[k]), x, y);
    c.font = font(600, 44);
    c.globalAlpha = 0.8;
    c.fillText(label, x + 130, y - 4);
    c.globalAlpha = 1;
  });

  // Étoiles : pied faible et gestes techniques.
  line(cy + 925);
  c.font = font(600, 34);
  c.textAlign = 'left';
  [
    ['Pied faible', card.weak_foot],
    ['Gestes', card.skill_moves],
  ].forEach(([label, n], i) => {
    const x = cx + 70 + i * (cw / 2 - 20);
    c.fillText(String(label), x, cy + 985);
    for (let s = 0; s < 5; s++) star(c, x + 20 + s * 52, cy + 1030, 20, s < Number(n), t.ink);
  });

  // Pied de l'image.
  c.textAlign = 'center';
  c.fillStyle = 'rgba(255,248,241,0.75)';
  c.font = font(600, 40);
  c.fillText(card.estimated ? 'Estimation à confirmer par mes coéquipiers' : `Notée par ${card.votes} coéquipier${card.votes > 1 ? 's' : ''}`, W / 2, 1660);
  c.fillStyle = '#fff8f1';
  c.font = font(800, 54);
  c.fillText('Crée la tienne sur supercity.fr', W / 2, 1790);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/png'));
}

/** Partage l'image (téléphone) ou la télécharge (ordinateur). */
export async function shareImage(blob: Blob, filename: string): Promise<'shared' | 'saved'> {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}
