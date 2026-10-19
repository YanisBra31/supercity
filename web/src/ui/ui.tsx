// Briques d'interface : boutons, champs, cartes, pastilles, avatars, fenêtres. Le style est dans styles.css.
import { AlertCircle, Check, ChevronDown, ChevronRight, Eye, EyeOff, LucideIcon } from 'lucide-react';
import { ComponentProps, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Link, LinkProps } from 'react-router';
import { Accent } from '../lib/api';

export type Icon = LucideIcon;

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ───────── Boutons ───────── */

type Variant = 'primary' | 'dark' | 'ghost' | 'light' | 'danger';
type BtnOwn = { variant?: Variant; icon?: Icon; loading?: boolean; small?: boolean; block?: boolean };

export function Button({ variant = 'primary', icon: I, loading, small, block, children, className, disabled, type = 'button', ...rest }: ComponentProps<'button'> & BtnOwn) {
  return (
    <button type={type} className={cx('btn', `btn--${variant}`, small && 'btn--small', block && 'btn--block', className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden /> : I ? <I size={small ? 16 : 19} aria-hidden /> : null}
      <span className="btn__label">{children}</span>
    </button>
  );
}

export function ButtonLink({ variant = 'primary', icon: I, small, block, children, className, ...rest }: LinkProps & BtnOwn) {
  return (
    <Link className={cx('btn', `btn--${variant}`, small && 'btn--small', block && 'btn--block', className)} {...rest}>
      {I ? <I size={small ? 16 : 19} aria-hidden /> : null}
      <span className="btn__label">{children}</span>
    </Link>
  );
}

export function IconButton({ icon: I, label, onClick, to, dark, badge }: { icon: Icon; label: string; onClick?: () => void; to?: string; dark?: boolean; badge?: number }) {
  const aria = badge ? `${label}, ${badge} nouveau${badge > 1 ? 'x' : ''}` : label;
  const inner = (
    <>
      <I size={20} aria-hidden />
      {badge ? <span className="dot-badge">{badge > 9 ? '9+' : badge}</span> : null}
    </>
  );
  if (to)
    return (
      <Link to={to} className={cx('icon-btn', dark && 'icon-btn--dark')} aria-label={aria} title={label}>
        {inner}
      </Link>
    );
  return (
    <button type="button" className={cx('icon-btn', dark && 'icon-btn--dark')} aria-label={aria} title={label} onClick={onClick}>
      {inner}
    </button>
  );
}

/* ───────── Textes ───────── */

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker">{children}</p>;
}
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return htmlFor ? (
    <label className="label" htmlFor={htmlFor}>
      {children}
    </label>
  ) : (
    <p className="label">{children}</p>
  );
}

/** En-tête d'onglet : sur-titre, grand titre, sous-titre, actions à droite. */
export function PageHeader({ kicker, title, sub, right }: { kicker?: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="grow">
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <h1>{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {right ? <div className="row">{right}</div> : null}
    </header>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="alert alert--error" role="alert">
      <AlertCircle size={18} aria-hidden style={{ flexShrink: 0 }} />
      <span>{children}</span>
    </p>
  );
}
export function Success({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="alert alert--ok" role="status">
      <Check size={18} aria-hidden style={{ flexShrink: 0 }} />
      <span>{children}</span>
    </p>
  );
}

/* ───────── Champs ───────── */

type FieldOwn = { label: string; error?: string; hint?: ReactNode };

export function Field({ label, error, hint, type, ...rest }: ComponentProps<'input'> & FieldOwn) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const password = type === 'password';
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className={cx('field__box', error && 'has-error')}>
        <input id={id} type={password && shown ? 'text' : type} aria-invalid={!!error || undefined} {...rest} />
        {password ? (
          <button type="button" className="link" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={{ color: 'var(--dim)', display: 'grid' }}>
            {shown ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : null}
      </div>
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, error, hint, ...rest }: ComponentProps<'textarea'> & FieldOwn) {
  const id = useId();
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className={cx('field__box', error && 'has-error')}>
        <textarea id={id} {...rest} />
      </div>
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

/** Liste déroulante native du navigateur. */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  const numeric = typeof value === 'number';
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="field__box">
        <select id={id} value={String(value)} onChange={(e) => onChange((numeric ? Number(e.target.value) : e.target.value) as T)}>
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden style={{ color: 'var(--dim)', pointerEvents: 'none' }} />
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

/** Choix parmi quelques valeurs, en pastilles. `allowEmpty` : retoucher la pastille choisie la désélectionne. */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  allowEmpty,
  label,
  scroll,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  allowEmpty?: boolean;
  label?: string;
  scroll?: boolean;
}) {
  return (
    <div className={cx('chips', scroll && 'chips--scroll')} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(value === o.value && allowEmpty ? null : o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ title, text, checked, onChange }: { title: string; text?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <span className="grow">
        <b>{title}</b>
        {text ? <span className="sub">{text}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/* ───────── Cartes et pastilles ───────── */

export function Card({ to, onClick, className, children, style }: { to?: string; onClick?: () => void; className?: string; children: ReactNode; style?: React.CSSProperties }) {
  if (to)
    return (
      <Link to={to} className={cx('card', className)} style={style}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={cx('card', className)} onClick={onClick} style={style}>
        {children}
      </button>
    );
  return (
    <div className={cx('card', className)} style={style}>
      {children}
    </div>
  );
}

export function Pill({ text, tone = 'orange', icon: I }: { text: string; tone?: 'orange' | 'dark' | 'green' | 'grey'; icon?: Icon }) {
  return (
    <span className={cx('pill', tone !== 'orange' && `pill--${tone}`)}>
      {I ? <I size={12} aria-hidden /> : null}
      {text}
    </span>
  );
}

export function Meta({ icon: I, children }: { icon: Icon; children: ReactNode }) {
  return (
    <p className="meta">
      <I size={16} aria-hidden />
      <span className="ellipsis">{children}</span>
    </p>
  );
}

export function Banner({ icon: I, title, text, to }: { icon: Icon; title: string; text: string; to: string }) {
  return (
    <Link to={to} className="banner">
      <I size={24} aria-hidden />
      <span className="grow">
        <b>{title}</b>
        <span>{text}</span>
      </span>
      <ChevronRight size={18} aria-hidden />
    </Link>
  );
}

export function Empty({ icon: I, title, text, action }: { icon: Icon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <I size={30} aria-hidden />
      </div>
      <h2>{title}</h2>
      {text ? <p className="sub">{text}</p> : null}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

export function Ball({ size = 32 }: { size?: number }) {
  return (
    <svg className="ball" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#fff8f1" stroke="#1f1a17" strokeWidth="3" />
      <path d="M32 18l10 7-4 12H26l-4-12z" fill="#1f1a17" />
      <path d="M32 18V4M42 25l13-5M38 37l8 12M26 37l-8 12M22 25L9 20" stroke="#1f1a17" strokeWidth="3" />
    </svg>
  );
}

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <Ball />
      <span className="sr">{label}</span>
    </div>
  );
}

/* ───────── Avatars ───────── */

export const ACCENTS: Record<Accent, { label: string; grad: string; solid: string }> = {
  orange: { label: 'Orange', grad: 'linear-gradient(135deg,#ff9417,#ff7a1e,#ff5223)', solid: '#ff5223' },
  nuit: { label: 'Nuit', grad: 'linear-gradient(135deg,#4a3f38,#2e2723,#1f1a17)', solid: '#1f1a17' },
  rouge: { label: 'Rouge', grad: 'linear-gradient(135deg,#ff5a5f,#e53935,#b71c1c)', solid: '#e53935' },
  bleu: { label: 'Bleu', grad: 'linear-gradient(135deg,#42a5f5,#1e88e5,#1565c0)', solid: '#1e88e5' },
  vert: { label: 'Vert', grad: 'linear-gradient(135deg,#66bb6a,#2e9d4f,#1b5e20)', solid: '#2e9d4f' },
  violet: { label: 'Violet', grad: 'linear-gradient(135deg,#ab47bc,#7e57c2,#4527a0)', solid: '#7e57c2' },
};

/** Photo du joueur, sinon son initiale sur sa couleur. */
export function Avatar({ name, uri, size = 44, tone = 'orange', ring }: { name: string; uri?: string | null; size?: number; tone?: Accent; ring?: boolean }) {
  const style: React.CSSProperties = { width: size, height: size, fontSize: size * 0.42, ...(ring ? { border: '3px solid var(--chalk)' } : {}) };
  if (uri) return <img className="avatar" src={uri} alt="" width={size} height={size} style={{ ...style, background: 'var(--tint)' }} loading="lazy" />;
  return (
    <span className="avatar" style={{ ...style, background: ACCENTS[tone]?.grad }} aria-hidden>
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Texte lisible (craie ou nuit) sur une couleur de fond. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? '#1f1a17' : '#fff8f1';
}

/** Blason d'équipe : logo, sinon initiales aux couleurs de l'équipe. */
export function TeamCrest({ name, logo, primary = '#ff5223', secondary = '#1f1a17', size = 50 }: { name: string; logo?: string | null; primary?: string; secondary?: string; size?: number }) {
  if (logo) return <img className="crest" src={logo} alt="" width={size} height={size} style={{ width: size, height: size, background: '#fff', border: '1px solid var(--line)', objectFit: 'contain' }} loading="lazy" />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span className="crest" style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(135deg, ${primary}, ${primary} 50%, ${secondary})`, color: readableOn(primary) }} aria-hidden>
      {initials || '?'}
    </span>
  );
}

/* ───────── Fenêtres ───────── */

/** Fenêtre native du navigateur (<dialog>) : centrée sur ordinateur, feuille en bas sur téléphone. Échap ferme. */
export function Sheet({ open, onClose, title, children, footer, right }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; right?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // Clic sur le fond : on ferme.
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <>
          <div className="sheet__head">
            <h2>{title}</h2>
            {right}
          </div>
          <div className="sheet__body">{children}</div>
          {footer ? <div className="sheet__foot">{footer}</div> : null}
        </>
      ) : null}
    </dialog>
  );
}

/** Demande de confirmation dans une fenêtre du site (pas la boîte grise du navigateur). */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; text: string; ok: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  const ask = (title: string, text: string, ok = 'Confirmer', danger = true) => new Promise<boolean>((resolve) => setState({ title, text, ok, danger, resolve }));
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = (
    <Sheet
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ''}
      footer={
        <>
          <Button variant={state?.danger ? 'danger' : 'primary'} block onClick={() => close(true)}>
            {state?.ok}
          </Button>
          <Button variant="ghost" block onClick={() => close(false)} style={{ borderColor: 'transparent' }}>
            Annuler
          </Button>
        </>
      }
    >
      <p className="sub">{state?.text}</p>
    </Sheet>
  );
  return { ask, dialog };
}

/** Petit message en bas de l'écran, qui disparaît tout seul. */
export function useToast() {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(''), 3200);
    return () => clearTimeout(t);
  }, [text]);
  const toast = text ? (
    <div className="toast" role="status">
      {text}
    </div>
  ) : null;
  return { show: setText, toast };
}
