// Lien discret vers une question de la page Aide, à la place d'un long texte d'explication.
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router';

export function HelpLink({ q, children, center }: { q: string; children: string; center?: boolean }) {
  return (
    <Link to={`/help?q=${encodeURIComponent(q)}`} className="help-link" style={center ? { alignSelf: 'center' } : undefined}>
      <HelpCircle size={16} aria-hidden />
      {children}
    </Link>
  );
}
