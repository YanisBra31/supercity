// Carte d'un défi : les deux blasons face à face, le créneau, le message et les actions.
import { Calendar, ChevronRight, MapPin, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { Challenge, TeamBrief } from '../lib/api';
import { formatLabel, whenLabel } from '../lib/format';
import { Button, Meta, Pill, TeamCrest } from './ui';

const STATUS: Record<Challenge['status'], { text: string; tone: 'orange' | 'dark' | 'green' | 'grey' }> = {
  pending: { text: 'En attente', tone: 'orange' },
  accepted: { text: 'Accepté', tone: 'green' },
  declined: { text: 'Refusé', tone: 'grey' },
  cancelled: { text: 'Retiré', tone: 'grey' },
  expired: { text: 'Expiré', tone: 'grey' },
};

/** Les deux équipes face à face, sur fond nuit. */
export function VersusBanner({ a, b, size = 48 }: { a: Pick<TeamBrief, 'name' | 'logo_url' | 'color_primary' | 'color_secondary'>; b: Pick<TeamBrief, 'name' | 'logo_url' | 'color_primary' | 'color_secondary'>; size?: number }) {
  return (
    <div className="vs">
      <div className="vs__side">
        <TeamCrest name={a.name} logo={a.logo_url} primary={a.color_primary} secondary={a.color_secondary} size={size} />
        <b>{a.name}</b>
      </div>
      <span className="vs__text">VS</span>
      <div className="vs__side">
        <TeamCrest name={b.name} logo={b.logo_url} primary={b.color_primary} secondary={b.color_secondary} size={size} />
        <b>{b.name}</b>
      </div>
    </div>
  );
}

export function ChallengeCard({
  c,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: {
  c: Challenge;
  index?: number;
  busy?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const st = STATUS[c.status];
  const link = c.status === 'accepted' && c.match_id ? `/match/${c.match_id}` : null;
  return (
    <div className="card stack challenge" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="kicker">{c.can_respond ? 'Défi reçu' : c.can_cancel ? 'Défi envoyé' : 'Défi'}</span>
        <Pill text={st.text} tone={st.tone} />
      </div>
      <VersusBanner a={c.from_team} b={c.to_team} />
      {c.starts_at ? <Meta icon={Calendar}>{`${whenLabel(c.starts_at)}${c.format ? ` · ${formatLabel(c.format)}` : ''}`}</Meta> : null}
      {c.venue ? <Meta icon={MapPin}>{c.venue.name}</Meta> : null}
      {c.message ? (
        <blockquote className="challenge__bubble">
          <p>« {c.message} »</p>
          {c.created_by ? <cite>{c.created_by.display_name}</cite> : null}
        </blockquote>
      ) : null}
      {c.response_message ? <p className="sub" style={{ fontStyle: 'italic' }}>Réponse : « {c.response_message} »</p> : null}
      {c.can_respond ? (
        <div className="row">
          <Button icon={Zap} onClick={onAccept} loading={busy} className="grow">
            Relever le défi
          </Button>
          <Button variant="ghost" onClick={onDecline} disabled={busy}>
            Refuser
          </Button>
        </div>
      ) : null}
      {c.can_cancel ? (
        <Button variant="ghost" onClick={onCancel} loading={busy}>
          Retirer le défi
        </Button>
      ) : null}
      {link ? (
        <Link to={link} className="link row" style={{ justifyContent: 'center', gap: 4 }}>
          Voir le match <ChevronRight size={16} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
