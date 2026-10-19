// Séries de victoires : flamme animée, badge de série, forme récente, roi du terrain et bannière d'événement bonus.
import { Flame as FlameIcon, TrendingUp, Trophy, Zap } from 'lucide-react';
import { CSSProperties } from 'react';
import { BonusEvent, Streak, VenueKing } from '../lib/api';
import { dayLabel, timeLabel } from '../lib/format';
import { Card, TeamCrest } from './ui';

// Même seuil que l'API (series.php) : à partir de 3 victoires d'affilée, l'équipe est en feu.
export const ON_FIRE = 3;

const FIRE = { outer: '#ff3d00', mid: '#ff8a00', core: '#ffd54f' };

/** Flamme vivante : trois couches qui vacillent, un halo qui respire et des étincelles. Immobile si `still`. */
export function Flame({ size = 28, still = false }: { size?: number; still?: boolean }) {
  if (still) return <FlameIcon size={size} color={FIRE.mid} fill={FIRE.mid} aria-hidden />;
  return (
    <span className="flame" style={{ width: size, height: size, '--s': `${size}px` } as CSSProperties} aria-hidden>
      <i className="flame__glow" />
      <FlameIcon className="flame__a" size={size} color={FIRE.outer} fill={FIRE.outer} />
      <FlameIcon className="flame__b" size={size * 0.78} color={FIRE.mid} fill={FIRE.mid} />
      <FlameIcon className="flame__c" size={size * 0.48} color={FIRE.core} fill={FIRE.core} />
      <i className="flame__ember" style={{ left: '32%' }} />
      <i className="flame__ember" style={{ left: '62%', animationDelay: '.45s' }} />
      <i className="flame__ember" style={{ left: '48%', animationDelay: '.8s' }} />
    </span>
  );
}

/** Badge de série : rien sous 2 victoires, flamme fixe à 2, flamme vivante à partir de 3. */
export function StreakBadge({ count, size = 'sm', onDark = false }: { count?: number; size?: 'sm' | 'md' | 'lg'; onDark?: boolean }) {
  if (!count || count < 2) return null;
  const hot = count >= ON_FIRE;
  const icon = { sm: 14, md: 20, lg: 34 }[size];
  const text = { sm: 11, md: 13, lg: 18 }[size];
  return (
    <span
      className="streak-badge"
      style={{
        background: onDark ? 'rgba(0,0,0,.35)' : hot ? 'rgba(255,61,0,.14)' : 'var(--tint)',
        padding: `3px ${size === 'lg' ? 12 : 8}px`,
        fontSize: text,
        color: onDark ? (hot ? FIRE.core : 'var(--chalk)') : hot ? FIRE.outer : 'var(--orange-2)',
      }}
      title={`${count} victoires d'affilée`}
    >
      <Flame size={icon} still={!hot} />
      {size === 'sm' ? count : `${count} victoires d'affilée`}
    </span>
  );
}

/** Forme récente : pastilles V (victoire), N (nul), D (défaite), la plus récente à gauche. */
export function FormDots({ form }: { form: Streak['form'] }) {
  if (!form.length) return null;
  const tone = { W: 'var(--success)', D: '#9e9e9e', L: 'var(--danger)' };
  const label = { W: 'V', D: 'N', L: 'D' };
  const title = { W: 'Victoire', D: 'Nul', L: 'Défaite' };
  return (
    <span className="row" style={{ gap: 5 }}>
      {form.map((r, i) => (
        <span key={i} className="form-dot" style={{ background: tone[r] }} title={title[r]}>
          {label[r]}
        </span>
      ))}
    </span>
  );
}

/** Carte de série d'une équipe (page équipe). */
export function StreakCard({ streak }: { streak?: Streak }) {
  if (!streak || (!streak.form.length && !streak.best)) return null;
  const hot = streak.on_fire;
  const inner = (
    <div className="row" style={{ gap: 14 }}>
      {hot ? <Flame size={52} /> : <TrendingUp size={34} color="var(--orange-2)" aria-hidden />}
      <div className="grow stack" style={{ gap: 6 }}>
        <p className="kicker" style={{ color: hot ? FIRE.core : undefined }}>
          {hot ? 'En feu' : 'Série en cours'}
        </p>
        <b style={{ fontSize: 18, fontWeight: 800, color: hot ? 'var(--chalk)' : undefined }}>
          {streak.current > 0 ? `${streak.current} victoire${streak.current > 1 ? 's' : ''} d'affilée` : 'Pas de série en cours'}
        </b>
        <div className="row">
          <FormDots form={streak.form} />
          {streak.best > 1 ? <span style={{ fontSize: 12, fontWeight: 500, color: hot ? 'rgba(255,248,241,.75)' : 'var(--dim)' }}>Record : {streak.best}</span> : null}
        </div>
      </div>
    </div>
  );
  return hot ? (
    <div className="hero" style={{ background: 'linear-gradient(135deg,#2a0f05,#5a1a00,#b33a00)', borderRadius: 20, padding: 16 }}>
      {inner}
    </div>
  ) : (
    <Card>{inner}</Card>
  );
}

/** Roi du terrain : l'équipe qui enchaîne les victoires sur ce terrain. */
export function KingCard({ king }: { king?: VenueKing | null }) {
  if (!king) return null;
  const t = king.team;
  return (
    <Card to={`/team/${t.id}`} className="row" style={{ gap: 12, display: 'flex' }}>
      <span style={{ position: 'relative' }}>
        <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={44} />
        <span className="king-crown">
          <Trophy size={12} color="#c49000" aria-hidden />
        </span>
      </span>
      <span className="grow">
        <span className="kicker" style={{ display: 'block' }}>Roi du terrain</span>
        <b style={{ display: 'block', fontSize: 16 }}>{t.name}</b>
        <span className="sub">{king.streak} victoires d'affilée ici. Qui les arrête ?</span>
      </span>
      {king.on_fire ? <Flame size={30} /> : <Flame size={24} still />}
    </Card>
  );
}

/** Ce que rapporte un événement : « Points x2 · +3 pts par match ». */
export function bonusLabel(e: BonusEvent): string {
  return [e.multiplier > 1 ? `Points x${e.multiplier}` : null, e.bonus_points ? `+${e.bonus_points} pt${e.bonus_points > 1 ? 's' : ''} par match` : null]
    .filter(Boolean)
    .join(' · ');
}

/** « jusqu'à dim. 19 oct. 23h59 » ou « dès sam. 18 oct. 10h00 ». */
export function bonusWhen(e: BonusEvent): string {
  const d = new Date(e.active ? e.ends_at : e.starts_at);
  return `${e.active ? "jusqu'à" : 'dès'} ${dayLabel(d).toLowerCase()} ${timeLabel(d)}`;
}

/** Bannière d'événement bonus (accueil, match). */
export function BonusBanner({ event, compact = false }: { event: BonusEvent; compact?: boolean }) {
  return (
    <div
      className="hero"
      style={{
        background: event.active ? 'linear-gradient(135deg,#ff3d00,#ff8a00,#ffb300)' : 'linear-gradient(135deg,#3a2a20,#1f1a17)',
        borderRadius: 18,
        padding: compact ? 12 : 16,
      }}
    >
      <div className="row" style={{ gap: 12 }}>
        {event.active ? <Flame size={compact ? 26 : 36} /> : <Zap size={compact ? 22 : 30} color={FIRE.core} fill={FIRE.core} aria-hidden />}
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#fff' }}>
          <span className="kicker" style={{ color: event.active ? '#fff3e0' : FIRE.core }}>
            {event.active ? 'Événement en cours' : 'Événement à venir'}
          </span>
          <b style={{ fontSize: compact ? 15 : 17, fontWeight: 800 }}>{event.title}</b>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{bonusLabel(event)}</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            {bonusWhen(event)}
            {event.venue ? ` · à ${event.venue.name}` : ''}
          </span>
          {!compact && event.description ? <span style={{ fontSize: 13, marginTop: 4 }}>{event.description}</span> : null}
        </div>
      </div>
    </div>
  );
}
