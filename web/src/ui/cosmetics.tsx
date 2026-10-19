// Cosmétiques de profil : pièces, cadre de photo (avec halo ou rotation), bannière à motif, titre et rareté.
import { Sparkles, Volleyball } from 'lucide-react';
import { CSSProperties } from 'react';
import { Accent, CosmeticBrief, Rarity } from '../lib/api';
import { Avatar, readableOn } from './ui';

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Commun', color: '#8d8079' },
  rare: { label: 'Rare', color: '#1e88e5' },
  epic: { label: 'Épique', color: '#7e57c2' },
  legendary: { label: 'Légendaire', color: '#c49000' },
};

export const GRADE_LABELS = ['Rookie', 'Espoir', 'Titulaire', 'Cadre', 'Star', 'Légende'];

const stops = (c: string[]) => (c.length >= 2 ? c : [c[0] ?? '#ff9417', c[0] ?? '#ff5223']);
const linear = (c: string[]) => `linear-gradient(135deg, ${stops(c).join(', ')})`;

/** Pièce Supercity : disque doré avec un ballon. */
export function Coin({ size = 18 }: { size?: number }) {
  return (
    <span className="coin" style={{ width: size, height: size, borderWidth: Math.max(1, size / 14) }} aria-hidden>
      <Volleyball size={size * 0.6} />
    </span>
  );
}

export function CoinAmount({ n, size = 16, color = 'var(--ink)' }: { n: number; size?: number; color?: string }) {
  return (
    <span className="row" style={{ gap: 5, display: 'inline-flex' }} aria-label={`${n} pièces`}>
      <Coin size={size} />
      <b style={{ fontSize: size * 0.95, lineHeight: 1.3, color, fontWeight: 800 }}>{n.toLocaleString('fr-FR')}</b>
    </span>
  );
}

export function RarityTag({ rarity, small }: { rarity: Rarity; small?: boolean }) {
  const r = RARITY[rarity];
  return (
    <span className={`rarity${small ? ' rarity--small' : ''}`} style={{ borderColor: r.color, color: r.color }}>
      {r.label}
    </span>
  );
}

/** Photo du joueur dans son cadre. Sans cadre : la pastille habituelle. */
export function FramedAvatar({ frame, name, uri, size, tone = 'nuit', ring = true }: { frame?: CosmeticBrief | null; name: string; uri?: string | null; size: number; tone?: Accent; ring?: boolean }) {
  if (!frame) return <Avatar name={name} uri={uri} size={size} tone={tone} ring={ring} />;
  const look = frame.look;
  const pad = Math.max(3, Math.round(size * 0.07));
  const outer = size + pad * 2;
  const border = Math.max(2, size * 0.025);
  const c = stops(look.colors);
  const ringBg = look.effect === 'spin' ? `conic-gradient(${c[0]}, ${c[1]}, ${c[0]})` : linear(look.colors);
  return (
    <span className="framed" style={{ width: outer, height: outer, '--glow': c[0] } as CSSProperties}>
      {look.effect === 'glow' || look.effect === 'spin' ? <span className="framed__glow" /> : null}
      <span className={`framed__ring${look.effect === 'spin' ? ' framed__ring--spin' : ''}`} style={{ background: ringBg }} />
      <span className="framed__photo" style={{ borderWidth: border }}>
        <Avatar name={name} uri={uri} size={size - border * 2} tone={tone} />
      </span>
    </span>
  );
}

/** Fond dégradé d'un en-tête selon la bannière (undefined sans bannière). */
export function bannerColors(banner?: CosmeticBrief | null) {
  return banner ? stops(banner.look.colors) : undefined;
}
export function bannerBackground(banner?: CosmeticBrief | null) {
  return banner ? linear(banner.look.colors) : undefined;
}

function FlameShape({ size }: { size: number }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 40 50" aria-hidden className="flame-shape">
      <path d="M20 2C24 14 36 20 36 33a16 16 0 0 1-32 0c0-8 5-12 8-17 2 5 4 7 7 8C19 17 17 10 20 2z" fill="#ff3d00" />
      <path d="M20 18c3 8 10 11 10 18a10 10 0 0 1-20 0c0-5 3-7 5-10 1 3 3 4 4 5 0-4-1-8 1-13z" fill="#ff8a00" />
      <path d="M20 31c2 4 5 5 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9z" fill="#ffd54f" />
    </svg>
  );
}

/** Motif posé sur la bannière (premier enfant d'un en-tête en position relative). */
export function BannerPattern({ banner }: { banner?: CosmeticBrief | null }) {
  const pattern = banner?.look.pattern;
  if (!pattern || pattern === 'none') return null;
  if (pattern === 'flames')
    return (
      <span className="banner-pattern banner-pattern--flames" aria-hidden>
        <FlameShape size={44} />
        <FlameShape size={70} />
        <FlameShape size={52} />
      </span>
    );
  return <span className={`banner-pattern banner-pattern--${pattern}`} aria-hidden />;
}

/** Titre affiché sous le pseudo. */
export function TitleTag({ title, size = 'md' }: { title?: CosmeticBrief | null; size?: 'sm' | 'md' }) {
  if (!title) return null;
  const c = stops(title.look.colors);
  const legendary = title.rarity === 'legendary';
  const ink = readableOn(c[0]);
  return (
    <span className={`title-tag${size === 'sm' ? ' title-tag--sm' : ''}${legendary ? ' title-tag--legendary' : ''}`} style={{ background: linear(title.look.colors), color: ink }}>
      {legendary ? <Sparkles size={size === 'sm' ? 10 : 12} aria-hidden /> : null}
      <span className="ellipsis">{title.name}</span>
    </span>
  );
}

/** Aperçu d'un cosmétique dans la boutique, porté par le joueur. */
export function CosmeticThumb({ item, name, uri }: { item: CosmeticBrief; name: string; uri?: string | null }) {
  if (item.type === 'frame')
    return (
      <div className="cos-thumb">
        <FramedAvatar frame={item} name={name} uri={uri} size={58} />
      </div>
    );
  if (item.type === 'banner')
    return (
      <div className="cos-thumb cos-thumb--banner" style={{ background: linear(item.look.colors) }}>
        <BannerPattern banner={item} />
      </div>
    );
  return (
    <div className="cos-thumb">
      <TitleTag title={item} size="sm" />
    </div>
  );
}
