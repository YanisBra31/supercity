// Badges compacts de la liste des joueurs : grade et rôle sur le site (modérateur, admin).
import { Footprints, Leaf, Shield, ShieldCheck, ShieldHalf, Shirt, Star, Trophy } from 'lucide-react';
import { Grade, Role } from '../../lib/api';
import { Icon } from '../ui';

const GRADE_STYLE: Record<Grade['key'], { icon: Icon; colors: [string, string] }> = {
  rookie: { icon: Footprints, colors: ['#b8aca3', '#8d8079'] },
  espoir: { icon: Leaf, colors: ['#66bb6a', '#2e7d32'] },
  titulaire: { icon: Shirt, colors: ['#42a5f5', '#1565c0'] },
  cadre: { icon: ShieldHalf, colors: ['#ab47bc', '#4527a0'] },
  star: { icon: Star, colors: ['#ff9417', '#ff5223'] },
  legende: { icon: Trophy, colors: ['#ffd54f', '#c49000'] },
};

export function GradeBadge({ grade }: { grade?: Grade | null }) {
  if (!grade) return null;
  const g = GRADE_STYLE[grade.key] ?? GRADE_STYLE.rookie;
  return (
    <span className="mini-badge" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
      <g.icon size={11} aria-hidden />
      {grade.label}
    </span>
  );
}

export function RoleBadge({ role }: { role?: Role }) {
  if (!role || role === 'user') return null;
  const admin = role === 'admin';
  const I = admin ? ShieldCheck : Shield;
  return (
    <span className="mini-badge" style={{ background: admin ? 'var(--night)' : '#2e7d32' }}>
      <I size={11} aria-hidden />
      {admin ? 'Admin' : 'Modo'}
    </span>
  );
}
