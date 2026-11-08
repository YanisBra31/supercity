// Story d'un match (1080×1920) : une fenêtre façon appli avec les places restantes, et en bas la place
// du sticker Lien d'Instagram ou de Snapchat. Le lien du match est écrit dessous, pour WhatsApp et TikTok.
import { Match } from './api';
import { font, fitFont, halo, loadImage } from './cardImage';
import { formatLabel, levelLabel } from './format';
import { euros } from './pay';

const W = 1080;
const H = 1920;

function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.closePath();
}

/** « Il manque 3 joueurs », « Dernière place », « Complet »… */
export function storyHeadline(m: Match): string {
  if (m.status === 'cancelled') return 'Match annulé';
  if (m.spots_left === 0) return 'Complet, liste d’attente ouverte';
  if (m.spots_left === 1) return 'Plus qu’une place !';
  return `Il manque ${m.spots_left} joueurs !`;
}

function longDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const time = d.toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', 'h');
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
}

export async function matchStoryImage(m: Match, link: string): Promise<Blob> {
  await Promise.all([document.fonts.load(font(800, 100)), document.fonts.load(font(600, 40))]).catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#0d0a08';
  c.fillRect(0, 0, W, H);
  halo(c, W * 0.95, H * 0.12, 950, 'rgba(255,82,35,0.6)');
  halo(c, 0, H * 0.75, 850, 'rgba(255,148,23,0.32)');

  // En-tête.
  const logo = await loadImage('/logo-blanc.png');
  const lw = logo ? (logo.width * 64) / logo.height : 0;
  if (logo) c.drawImage(logo, 90, 110, lw, 64);
  c.fillStyle = '#fff8f1';
  c.font = font(800, 44);
  c.textAlign = 'left';
  c.fillText('Supercity', 90 + (logo ? lw + 18 : 0), 158);

  // Accroche.
  const headline = storyHeadline(m);
  c.textAlign = 'center';
  fitFont(c, headline, 800, 92, W - 160);
  c.fillText(headline, W / 2, 330);

  // La fenêtre du match, en verre dépoli.
  const px = 80;
  const py = 400;
  const pw = W - 160;
  const ph = 1000;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 90;
  c.shadowOffsetY = 30;
  rounded(c, px, py, pw, ph, 64);
  c.fillStyle = 'rgba(30,24,20,0.82)';
  c.fill();
  c.restore();
  rounded(c, px, py, pw, ph, 64);
  c.strokeStyle = 'rgba(255,248,241,0.16)';
  c.lineWidth = 3;
  c.stroke();

  const ix = px + 70;
  const iw = pw - 140;
  // Étiquette du format et du prix.
  const tag = `${formatLabel(m.format)} · ${m.price_cents > 0 ? euros(m.price_cents) : 'Gratuit'}`;
  c.font = font(700, 38);
  const tw = c.measureText(tag).width + 60;
  rounded(c, ix, py + 70, tw, 72, 36);
  c.fillStyle = 'rgba(255,148,23,0.18)';
  c.fill();
  c.fillStyle = '#ffb347';
  c.textAlign = 'left';
  c.fillText(tag, ix + 30, py + 120);

  // Titre, date, terrain.
  const title = m.title ?? formatLabel(m.format);
  c.fillStyle = '#fff8f1';
  fitFont(c, title, 800, 84, iw);
  c.fillText(title, ix, py + 250);
  c.fillStyle = '#ff9417';
  fitFont(c, longDate(m.starts_at), 700, 46, iw);
  c.fillText(longDate(m.starts_at), ix, py + 325);
  c.fillStyle = 'rgba(255,248,241,0.72)';
  const where = m.venue.city ? `${m.venue.name} · ${m.venue.city}` : m.venue.name;
  fitFont(c, where, 600, 40, iw);
  c.fillText(where, ix, py + 390);
  c.font = font(600, 36);
  c.fillText(levelLabel(m.level), ix, py + 445);

  // Places : une pastille par joueur, puis la barre de remplissage.
  const max = m.max_players;
  const taken = Math.min(max, max - m.spots_left);
  const step = Math.min(78, iw / Math.max(1, max));
  const d = Math.max(14, step * 0.72);
  if (max <= 30) {
    for (let i = 0; i < max; i++) {
      const cx = ix + d / 2 + i * step;
      const cy = py + 560;
      c.beginPath();
      c.arc(cx, cy, d / 2, 0, Math.PI * 2);
      if (i < taken) {
        c.fillStyle = '#ff6a23';
        c.fill();
      } else {
        c.strokeStyle = 'rgba(255,248,241,0.45)';
        c.lineWidth = 4;
        c.stroke();
      }
    }
  }
  rounded(c, ix, py + 640, iw, 22, 11);
  c.fillStyle = 'rgba(255,248,241,0.1)';
  c.fill();
  if (taken > 0) {
    const g = c.createLinearGradient(ix, 0, ix + iw, 0);
    g.addColorStop(0, '#ff9417');
    g.addColorStop(1, '#ff5223');
    rounded(c, ix, py + 640, Math.max(22, (iw * taken) / max), 22, 11);
    c.fillStyle = g;
    c.fill();
  }
  c.fillStyle = 'rgba(255,248,241,0.72)';
  c.font = font(600, 38);
  c.fillText(`${taken} inscrit${taken > 1 ? 's' : ''} sur ${max}`, ix, py + 725);

  // Le bouton, comme dans l'appli.
  const bg = c.createLinearGradient(ix, 0, ix + iw, 0);
  bg.addColorStop(0, '#ff9417');
  bg.addColorStop(1, '#ff5223');
  c.save();
  c.shadowColor = 'rgba(255,82,35,0.45)';
  c.shadowBlur = 40;
  c.shadowOffsetY = 12;
  rounded(c, ix, py + 800, iw, 130, 65);
  c.fillStyle = bg;
  c.fill();
  c.restore();
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.font = font(800, 50);
  c.fillText(m.spots_left > 0 ? 'Je rejoins le match' : 'Je m’inscris en attente', W / 2, py + 883);

  // Place du sticker Lien, avec le lien écrit pour les réseaux qui n'en ont pas.
  c.setLineDash([18, 14]);
  rounded(c, 140, 1520, W - 280, 150, 75);
  c.strokeStyle = 'rgba(255,248,241,0.5)';
  c.lineWidth = 4;
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#fff8f1';
  fitFont(c, link.replace(/^https?:\/\//, ''), 700, 50, W - 360);
  c.fillText(link.replace(/^https?:\/\//, ''), W / 2, 1612);
  c.fillStyle = 'rgba(255,248,241,0.7)';
  c.font = font(600, 36);
  c.fillText('Viens seul ou avec tes potes', W / 2, 1770);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/png'));
}
