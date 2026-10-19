// Score d'un match entre deux équipes : les capitaines l'annoncent et le confirment, la modération tranche.
import { Check, CheckCheck, Minus, PencilLine, Plus } from 'lucide-react';
import { useState } from 'react';
import { Match, MatchScore } from '../../lib/api';
import { Button } from '../ui';

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.max(0, Math.min(99, n)));
  return (
    <div className="stepper">
      <span className="ellipsis sub" style={{ fontWeight: 600, fontSize: 13 }}>
        {label}
      </span>
      <div className="row">
        <button type="button" className="stepper__btn" onClick={() => set(value - 1)} aria-label={`Un but de moins pour ${label}`}>
          <Minus size={20} />
        </button>
        <input
          className="stepper__num"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={value}
          onChange={(e) => set(Number(e.target.value) || 0)}
          aria-label={`Buts de ${label}`}
        />
        <button type="button" className="stepper__btn" onClick={() => set(value + 1)} aria-label={`Un but de plus pour ${label}`}>
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

/** Texte d'état du score pour celui qui regarde. */
function scoreHint(m: Match, sc: MatchScore): string {
  const reporter = sc.reported_by_team_id === m.home_team?.id ? m.home_team?.name : m.away_team?.name;
  if (sc.status === 'confirmed') return 'Score validé.';
  if (sc.status === 'disputed') return "Les deux capitaines ne sont pas d'accord. Annoncez le même score, ou la modération tranchera.";
  if (sc.status === 'reported') {
    return sc.can_confirm ? `${reporter} annonce ce score. Confirme-le, ou annonce le bon.` : `Annoncé par ${reporter}. En attente de l'autre capitaine (validé tout seul sous 48 h).`;
  }
  return sc.can_report ? 'Match terminé : annonce le score pour faire avancer la série de ton équipe.' : 'Score pas encore annoncé.';
}

export function ScoreCard({
  m,
  busy,
  moderator,
  onReport,
  onConfirm,
  onModerate,
}: {
  m: Match;
  busy: boolean;
  moderator: boolean;
  onReport: (home: number, away: number) => void;
  onConfirm: () => void;
  onModerate: (home: number, away: number) => void;
}) {
  const sc = m.score;
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState(sc?.home ?? 0);
  const [away, setAway] = useState(sc?.away ?? 0);
  if (!sc || m.status !== 'played' || !m.home_team || !m.away_team) return null;
  const canEdit = sc.can_report || moderator;
  const showForm = editing || (sc.can_report && sc.status === null);
  const disputed = sc.status === 'disputed';

  return (
    <section className="card stack" style={{ gap: 12, ...(disputed ? { borderColor: 'var(--danger)', borderWidth: 2 } : {}) }}>
      <p className="kicker" style={disputed ? { color: 'var(--danger)' } : undefined}>
        {disputed ? 'Score contesté' : 'Résultat'}
      </p>
      <p>{scoreHint(m, sc)}</p>
      {showForm ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
            (sc.can_report ? onReport : onModerate)(home, away);
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <Stepper label={m.home_team.name} value={home} onChange={setHome} />
            <Stepper label={m.away_team.name} value={away} onChange={setAway} />
          </div>
          <Button type="submit" icon={Check} loading={busy} block>
            {sc.can_report ? 'Annoncer le score' : 'Valider ce score (modération)'}
          </Button>
        </form>
      ) : null}
      {!showForm && sc.can_confirm ? (
        <Button icon={CheckCheck} loading={busy} onClick={onConfirm} block>
          {`Confirmer ${sc.home} - ${sc.away}`}
        </Button>
      ) : null}
      {!showForm && canEdit ? (
        <Button
          variant="ghost"
          icon={PencilLine}
          block
          onClick={() => {
            setHome(sc.home ?? 0);
            setAway(sc.away ?? 0);
            setEditing(true);
          }}
        >
          {sc.can_report ? 'Annoncer un autre score' : 'Corriger le score (modération)'}
        </Button>
      ) : null}
    </section>
  );
}
