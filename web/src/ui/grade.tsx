// Grade du joueur : badge compact, carte de progression vers le grade suivant, badge Admin ou Modo.
import { Leaf, Shield, ShieldCheck, ShieldHalf, Shirt, Star, Trophy, Volleyball } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Grade, Role } from '../lib/api';
import { Icon } from './ui';

export const GRADE_STYLE: Record<Grade['key'], { icon: Icon; colors: readonly [string, string] }> = {
  rookie: { icon: Volleyball, colors: ['#b8aca3', '#8d8079'] },
  espoir: { icon: Leaf, colors: ['#66bb6a', '#2e7d32'] },
  titulaire: { icon: Shirt, colors: ['#42a5f5', '#1565c0'] },
  cadre: { icon: ShieldHalf, colors: ['#ab47bc', '#4527a0'] },
  star: { icon: Star, colors: ['#ff9417', '#ff5223'] },
  legende: { icon: Trophy, colors: ['#ffd54f', '#c49000'] },
};

const grad = (c: readonly string[]) => `linear-gradient(135deg, ${c.join(', ')})`;

export function GradeBadge({ grade, size = 'sm' }: { grade?: Grade; size?: 'sm' | 'md' }) {
  if (!grade) return null;
  const g = GRADE_STYLE[grade.key] ?? GRADE_STYLE.rookie;
  const md = size === 'md';
  return (
    <span className={`grade-badge${md ? ' grade-badge--md' : ''}`} style={{ background: grad(g.colors) }}>
      <g.icon size={md ? 14 : 11} aria-hidden />
      {grade.label}
    </span>
  );
}

export function GradeCard({ grade }: { grade?: Grade }) {
  const ratio = grade && grade.next_at ? (grade.points - grade.min) / (grade.next_at - grade.min) : 1;
  // La barre se remplit à l'arrivée.
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0.04, Math.min(1, ratio))), 200);
    return () => clearTimeout(t);
  }, [ratio]);
  if (!grade) return null;
  const g = GRADE_STYLE[grade.key] ?? GRADE_STYLE.rookie;
  const left = grade.next_at ? grade.next_at - grade.points : 0;
  return (
    <section className="card grade-card">
      <div className="row" style={{ gap: 14 }}>
        <span className="grade-card__medal" style={{ background: grad(g.colors) }}>
          <g.icon size={26} aria-hidden />
        </span>
        <div className="grow">
          <p className="kicker">Grade {grade.level}/6</p>
          <b className="grade-card__title">{grade.label}</b>
          <p className="sub" style={{ fontSize: 13 }}>
            {grade.next_label ? `Encore ${left} point${left > 1 ? 's' : ''} pour devenir ${grade.next_label}` : 'Grade maximum atteint. Respect.'}
          </p>
        </div>
        <b style={{ fontSize: 16 }}>{grade.points} pts</b>
      </div>
      <div className="grade-card__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="Progression vers le grade suivant">
        <span style={{ width: `${w * 100}%`, background: grad(g.colors) }} />
      </div>
      <p className="sub" style={{ fontSize: 12 }}>
        1 point par match joué, 2 de plus par victoire, 2 par match organisé. Chaque point rapporte 10 pièces pour la boutique.
      </p>
    </section>
  );
}

/** Badge « Admin » ou « Modo » ; rien pour un joueur. */
export function RoleBadge({ role }: { role?: Role }) {
  if (!role || role === 'user') return null;
  const admin = role === 'admin';
  const I = admin ? ShieldCheck : Shield;
  return (
    <span className="grade-badge" style={{ background: admin ? 'var(--night)' : '#2e7d32' }}>
      <I size={11} aria-hidden />
      {admin ? 'Admin' : 'Modo'}
    </span>
  );
}

