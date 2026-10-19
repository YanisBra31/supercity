// Carte joueur façon FUT : note globale, poste, photo, six stats et étoiles (pied faible, gestes techniques).
import { Star } from 'lucide-react';
import { CardStat, PlayerCard as Card, Position } from '../lib/api';
import { Avatar } from './ui';

export const CARD_STATS: { key: CardStat; short: string; label: string }[] = [
  { key: 'pac', short: 'VIT', label: 'Vitesse' },
  { key: 'sho', short: 'TIR', label: 'Tir' },
  { key: 'pas', short: 'PAS', label: 'Passe' },
  { key: 'dri', short: 'DRI', label: 'Dribble' },
  { key: 'def', short: 'DEF', label: 'Défense' },
  { key: 'phy', short: 'PHY', label: 'Physique' },
];
const POS: Record<Position, string> = { gardien: 'GB', defenseur: 'DEF', milieu: 'MIL', attaquant: 'ATT' };

/** Bronze, argent, or, puis la carte noire des meilleurs. */
function tier(overall: number) {
  if (overall >= 87) return { stops: ['#3a302b', '#1f1a17'], ink: '#ffd54f', line: 'rgba(255,213,79,.35)' };
  if (overall >= 75) return { stops: ['#fff0b8', '#d9a92c'], ink: '#3b2a05', line: 'rgba(59,42,5,.2)' };
  if (overall >= 65) return { stops: ['#f4f6f8', '#a3acb4'], ink: '#23292e', line: 'rgba(35,41,46,.2)' };
  return { stops: ['#f0c79c', '#a0643a'], ink: '#3a1f0c', line: 'rgba(58,31,12,.2)' };
}

/** Cinq étoiles ; avec `onPick`, chaque étoile est un bouton. */
export function Stars({ n, size = 12, color, onPick, label }: { n: number; size?: number; color: string; onPick?: (n: number) => void; label?: string }) {
  if (!onPick)
    return (
      <span className="stars" aria-label={`${n} sur 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} color={color} fill={i <= n ? color : 'none'} aria-hidden />
        ))}
      </span>
    );
  return (
    <span className="stars stars--pick" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={i === n} aria-label={`${i} étoile${i > 1 ? 's' : ''}`} onClick={() => onPick(i)}>
          <Star size={size} color={color} fill={i <= n ? color : 'none'} aria-hidden />
        </button>
      ))}
    </span>
  );
}

export function PlayerCardView({ card, name, uri, position }: { card: Card; name: string; uri: string | null; position: Position | null }) {
  const t = tier(card.overall);
  return (
    <div className="pcard-wrap">
      <div className="pcard" style={{ background: `linear-gradient(160deg, ${t.stops[0]}, ${t.stops[1]})`, color: t.ink }}>
        <div className="pcard__top">
          <div style={{ textAlign: 'center' }}>
            <b className="pcard__overall">{card.overall}</b>
            <b className="pcard__pos">{position ? POS[position] : 'JOU'}</b>
          </div>
          <Avatar name={name} uri={uri} size={96} />
        </div>
        <b className="pcard__name ellipsis" style={{ borderColor: t.line }}>
          {name.toUpperCase()}
        </b>
        <div className="pcard__grid">
          {CARD_STATS.map((s) => (
            <span key={s.key} title={s.label}>
              <b>{card.stats[s.key]}</b>
              <small>{s.short}</small>
            </span>
          ))}
        </div>
        <div className="pcard__stars" style={{ borderColor: t.line }}>
          <span>
            Pied faible <Stars n={card.weak_foot} color={t.ink} />
          </span>
          <span>
            Gestes <Stars n={card.skill_moves} color={t.ink} />
          </span>
        </div>
      </div>
      <p className="sub" style={{ fontSize: 12, textAlign: 'center' }}>
        {card.estimated ? `Estimation du joueur · ${card.votes}/3 votes pour la confirmer` : `Notée par ses coéquipiers · ${card.votes} vote${card.votes > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}

/** Alias attendu par les autres pages. */
export const PlayerCard = PlayerCardView;
