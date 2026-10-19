// Champs particuliers : jauge de mot de passe, case à cocher, date de naissance, code à 6 chiffres.
import { Check, X } from 'lucide-react';
import { ReactNode, useId } from 'react';
import { passwordRules, passwordScore, SCORE_LABELS } from '../lib/password';

const SCORE_COLORS = ['var(--danger)', 'var(--danger)', 'var(--orange-1)', 'var(--success)', 'var(--success)'];

export function PasswordMeter({ password, personal }: { password: string; personal: string[] }) {
  const score = passwordScore(password, personal);
  const rules = passwordRules(password, personal);
  return (
    <span className="stack" style={{ gap: 6, marginTop: 2 }}>
      <span className="row" style={{ gap: 10 }}>
        <span className="bar grow">
          <i style={{ width: password ? `${((score + 1) / 5) * 100}%` : 0, background: SCORE_COLORS[score], transition: 'width .3s' }} />
        </span>
        {password ? <b style={{ fontSize: 12, color: SCORE_COLORS[score] }}>{SCORE_LABELS[score]}</b> : null}
      </span>
      <span className="stack" style={{ gap: 2 }}>
        {rules.map((r) => (
          <span key={r.label} className="row" style={{ gap: 6, fontSize: 12.5, color: r.ok ? 'var(--success)' : 'var(--dim)' }}>
            {r.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
            {r.label}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Checkbox({ checked, onChange, error, children }: { checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--orange-2)', flexShrink: 0 }} />
        <label htmlFor={id} style={{ fontSize: 14 }}>
          {children}
        </label>
      </div>
      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}

/** Date de naissance (calendrier du navigateur). Renvoie AAAA-MM-JJ. */
export function BirthDateField({ value, onChange, error }: { value: string; onChange: (iso: string) => void; error?: string }) {
  const id = useId();
  const max = new Date();
  max.setFullYear(max.getFullYear() - 15);
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        Date de naissance
      </label>
      <div className={`field__box${error ? ' has-error' : ''}`}>
        <input id={id} type="date" value={value} min="1920-01-01" max={max.toISOString().slice(0, 10)} onChange={(e) => onChange(e.target.value)} autoComplete="bday" />
      </div>
      {error ? <p className="field__error">{error}</p> : <p className="field__hint">Il faut avoir au moins 15 ans. Elle n'apparaît pas sur ton profil.</p>}
    </div>
  );
}

/** Code à 6 chiffres reçu par e-mail. Le navigateur peut le proposer tout seul. */
export function CodeField({ value, onChange, error, autoFocus = true }: { value: string; onChange: (v: string) => void; error?: string; autoFocus?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        Code reçu par e-mail
      </label>
      <div className={`field__box${error ? ' has-error' : ''}`}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          autoFocus={autoFocus}
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.4em', textAlign: 'center' }}
        />
      </div>
      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}
