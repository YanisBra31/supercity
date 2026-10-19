// Carte d'un match dans les listes : bloc date façon ticket, format, terrain, remplissage et prix.
import { BarChart3, Briefcase, CheckCircle2, CreditCard, Flag, Flame, Hourglass, Lock, MapPin, Shield, Star, Users, XCircle } from 'lucide-react';
import { Match } from '../lib/api';
import { distanceLabel, formatLabel, formatShort, levelLabel, timeLabel } from '../lib/format';
import { euros } from '../lib/pay';
import { ON_FIRE } from './streak';
import { Card, Meta, Pill } from './ui';

const DAYS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function statusPill(m: Match) {
  // Mon statut d'abord (ce que je dois faire), puis l'état du match.
  if (m.status === 'cancelled') return <Pill text="Annulé" tone="grey" icon={XCircle} />;
  if (m.status === 'played') return m.ratings_left ? <Pill text="À noter" icon={Star} /> : <Pill text="Terminé" tone="grey" icon={Flag} />;
  if (m.my_status === 'registered') return <Pill text="Je joue" tone="green" icon={CheckCircle2} />;
  if (m.my_status === 'pending') return <Pill text="À payer" icon={CreditCard} />;
  if (m.my_status === 'waitlist') return <Pill text="Liste d'attente" tone="dark" icon={Hourglass} />;
  if (m.status === 'full') return <Pill text="Complet" tone="dark" icon={Lock} />;
  if (m.spots_left <= 2) return <Pill text={`Plus que ${m.spots_left} place${m.spots_left > 1 ? 's' : ''}`} icon={Flame} />;
  return <Pill text={`${m.spots_left} places`} tone="grey" />;
}

// Bloc date façon ticket : jour, numéro, mois, heure, sur le dégradé.
function DateBlock({ iso, dim }: { iso: string; dim: boolean }) {
  const d = new Date(iso);
  return (
    <span className={`mc__date${dim ? ' mc__date--dim' : ''}`}>
      <span className="mc__day">{DAYS[d.getDay()]}</span>
      <span className="mc__num">{d.getDate()}</span>
      <span className="mc__month">{MONTHS[d.getMonth()]}</span>
      <span className="mc__time">{timeLabel(d)}</span>
    </span>
  );
}

const fire = (n?: number) => ((n ?? 0) >= ON_FIRE ? ' 🔥' : '');

export function MatchCard({ match: m }: { match: Match }) {
  const fill = Math.min(1, m.players_count / m.max_players);
  const dist = distanceLabel(m.venue.distance_km);
  const over = m.status === 'cancelled' || m.status === 'played';
  return (
    <Card to={`/match/${m.id}`} className="mc">
      <DateBlock iso={m.starts_at} dim={over} />
      <span className="mc__body">
        <span className="mc__head">
          <span className="mc__format">
            {m.kind === 'tournament' ? 'Tournoi' : formatLabel(m.format)} <span>· {formatShort(m.format)}</span>
          </span>
          {statusPill(m)}
        </span>
        <b className="mc__venue ellipsis">{m.title ?? m.venue.name}</b>
        <Meta icon={MapPin}>{[m.title ? m.venue.name : null, m.venue.city, dist].filter(Boolean).join(' · ') || m.venue.address}</Meta>
        {m.organization ? <Meta icon={Briefcase}>{m.organization.name}</Meta> : null}
        {m.home_team ? (
          <Meta icon={Shield}>
            {m.score?.status === 'confirmed' && m.away_team
              ? `${m.home_team.name} ${m.score.home} - ${m.score.away} ${m.away_team.name}`
              : `${m.home_team.name}${fire(m.home_team.streak)} vs ${m.away_team ? `${m.away_team.name}${fire(m.away_team.streak)}` : 'adversaire à trouver'}`}
          </Meta>
        ) : (
          <Meta icon={BarChart3}>{levelLabel(m.level)}</Meta>
        )}
        <span className="bar" style={{ marginTop: 6 }}>
          <i style={{ width: `${fill * 100}%` }} />
        </span>
        <span className="mc__foot">
          <Users size={13} aria-hidden />
          <span>
            {m.players_count}/{m.max_players} joueurs
            {m.waitlist_count ? ` · ${m.waitlist_count} en attente` : ''}
          </span>
          <b className={m.price_cents ? '' : 'mc__free'}>{m.price_cents ? euros(m.price_cents) : 'Gratuit'}</b>
        </span>
      </span>
    </Card>
  );
}
