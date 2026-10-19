// Récapitulatif avant tout achat (règle du « double clic », art. 1127-2 du Code civil) :
// le joueur voit ce qu'il achète et le prix total, peut revenir en arrière, puis confirme.
import { CreditCard } from 'lucide-react';
import { Link } from 'react-router';
import { Button, Icon, Sheet } from './ui';

export type OrderLine = { label: string; value: string };

export function OrderSheet({
  open,
  title,
  lines,
  total,
  notes = [],
  help,
  confirm,
  icon = CreditCard,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  lines: OrderLine[];
  total: OrderLine;
  notes?: string[];
  /** Question de la page Aide à proposer sous le récapitulatif. */
  help?: string;
  confirm: string;
  icon?: Icon;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button icon={icon} loading={busy} block onClick={onConfirm}>
            {confirm}
          </Button>
          <Button variant="ghost" block onClick={onClose} style={{ borderColor: 'transparent' }}>
            Modifier
          </Button>
        </>
      }
    >
      <p className="kicker">Vérifie avant de confirmer</p>
      <dl className="order">
        {lines.map((l) => (
          <div key={l.label} className="order__line">
            <dt>{l.label}</dt>
            <dd>{l.value}</dd>
          </div>
        ))}
        <div className="order__line order__total">
          <dt>{total.label}</dt>
          <dd>{total.value}</dd>
        </div>
      </dl>
      {notes.map((n) => (
        <p key={n} className="sub" style={{ fontSize: 13 }}>
          {n}
        </p>
      ))}
      <p className="row" style={{ gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
        {help ? (
          <Link to={`/help?q=${encodeURIComponent(help)}`} className="link" onClick={onClose}>
            Questions fréquentes
          </Link>
        ) : null}
        <Link to="/cgu" className="link" onClick={onClose}>
          Conditions d'utilisation
        </Link>
      </p>
    </Sheet>
  );
}
