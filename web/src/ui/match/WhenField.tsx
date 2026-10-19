// Choix du jour et de l'heure d'un match : jours proches en pastilles, calendrier du navigateur pour le reste,
// heures habituelles en pastilles et toutes les demi-heures dans une liste.
import { CalendarDays } from 'lucide-react';
import { useId } from 'react';
import { Chips } from '../ui';

// On peut publier jusqu'à 3 mois à l'avance.
const MAX_DAYS = 90;
const LEAD_MS = 15 * 60 * 1000;
const SHORT_DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
// Les heures où l'on joue le plus : proposées en premier.
const USUAL = [18 * 60, 19 * 60, 20 * 60, 21 * 60];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const at = (day: Date, minutes: number) => new Date(day.getTime() + minutes * 60000);
const hhmm = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Créneaux de 30 min encore possibles ce jour-là (au moins 15 min d'avance). */
export function freeTimes(day: Date): number[] {
  const out: number[] = [];
  for (let m = 8 * 60; m < 24 * 60; m += 30) if (at(day, m).getTime() >= Date.now() + LEAD_MS) out.push(m);
  return out;
}

/** Heure proposée d'office ce jour-là : 19h si possible, sinon la plus proche des heures habituelles. */
export function defaultTime(day: Date): number | null {
  const free = freeTimes(day);
  return [19 * 60, 20 * 60, 21 * 60, 18 * 60].find((m) => free.includes(m)) ?? free[0] ?? null;
}

/** Premier jour où il reste un créneau (aujourd'hui, ou demain s'il est tard). */
export function firstOpenDay(): Date {
  const today = startOfDay(new Date());
  return freeTimes(today).length ? today : plusDays(today, 1);
}

const shortDay = (d: Date) => {
  const today = startOfDay(new Date());
  if (d.getTime() === today.getTime()) return "Aujourd'hui";
  if (d.getTime() === plusDays(today, 1).getTime()) return 'Demain';
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()}`;
};

export function WhenField({ day, minutes, onChange }: { day: Date; minutes: number | null; onChange: (day: Date, minutes: number | null) => void }) {
  const dateId = useId();
  const timeId = useId();
  const today = startOfDay(new Date());
  const quick = Array.from({ length: 7 }, (_, i) => plusDays(today, i)).filter((d) => freeTimes(d).length);
  const free = freeTimes(day);
  const pickDay = (d: Date) => {
    // On garde l'heure choisie si elle reste possible ce jour-là.
    const keep = minutes !== null && freeTimes(d).includes(minutes);
    onChange(d, keep ? minutes : defaultTime(d));
  };
  const usual = USUAL.filter((m) => free.includes(m));
  return (
    <div className="stack when">
      <Chips label="Jour" scroll options={quick.map((d) => ({ value: d.getTime(), label: shortDay(d) }))} value={day.getTime()} onChange={(v) => v && pickDay(new Date(v))} />
      <div className="row when__row">
        <label className="when__date" htmlFor={dateId}>
          <CalendarDays size={18} aria-hidden />
          <span className="sr">Autre date</span>
          <input
            id={dateId}
            type="date"
            value={isoDay(day)}
            min={isoDay(today)}
            max={isoDay(plusDays(today, MAX_DAYS))}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, mo, d] = e.target.value.split('-').map(Number);
              const next = new Date(y!, mo! - 1, d!);
              if (freeTimes(next).length) pickDay(next);
            }}
          />
        </label>
        <label className="sr" htmlFor={timeId}>
          Heure
        </label>
        <div className="field__box when__time">
          <select id={timeId} value={minutes ?? ''} onChange={(e) => onChange(day, e.target.value === '' ? null : Number(e.target.value))}>
            {minutes === null ? <option value="">Heure…</option> : null}
            {free.map((m) => (
              <option key={m} value={m}>
                {hhmm(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {usual.length ? <Chips label="Heures habituelles" options={usual.map((m) => ({ value: m, label: hhmm(m) }))} value={minutes} onChange={(v) => v !== null && onChange(day, v)} /> : null}
      {!free.length ? <p className="sub">Plus de créneau ce jour-là, choisis un autre jour.</p> : null}
    </div>
  );
}
