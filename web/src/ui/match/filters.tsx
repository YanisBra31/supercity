// Filtres de la recherche de matchs : raccourcis de date, fenêtre de filtres, filtres actifs retirables.
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Format } from '../../lib/api';
import { FORMATS, LEVELS } from '../../lib/format';
import { Button, Chips, Label, Sheet, Switch } from '../ui';

export type When = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week';
export type Filters = {
  when: When;
  format: Format | null;
  level: number | null;
  radius: number;
  onlyOpen: boolean;
  sort: 'distance' | 'date';
};

export const DEFAULT_FILTERS: Filters = { when: 'all', format: null, level: null, radius: 15, onlyOpen: false, sort: 'distance' };
export const RADII = [5, 15, 30, 60];

const WHEN: { value: When; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'tomorrow', label: 'Demain' },
  { value: 'weekend', label: 'Ce week-end' },
  { value: 'week', label: '7 jours' },
];

/** Bornes de date envoyées à l'API pour un raccourci. */
export function whenRange(when: When): { from?: string; to?: string } {
  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };
  const iso = (d: Date) => d.toISOString();
  switch (when) {
    case 'today':
      return { from: iso(now), to: iso(day(1)) };
    case 'tomorrow':
      return { from: iso(day(1)), to: iso(day(2)) };
    case 'weekend': {
      // Samedi 0 h au lundi 0 h ; le dimanche, on garde la fin du week-end.
      const dow = now.getDay();
      const sat = day(dow === 0 ? -1 : 6 - dow);
      const mon = new Date(sat);
      mon.setDate(sat.getDate() + 2);
      return { from: iso(sat > now ? sat : now), to: iso(mon) };
    }
    case 'week':
      return { from: iso(now), to: iso(day(8)) };
    default:
      return {};
  }
}

/** Nombre de filtres de la fenêtre qui diffèrent des valeurs par défaut. */
export function activeCount(f: Filters, hasCoords: boolean): number {
  return [f.format !== null, f.level !== null, hasCoords && f.radius !== DEFAULT_FILTERS.radius, f.onlyOpen, hasCoords && f.sort !== 'distance'].filter(Boolean).length;
}

export function WhenBar({ value, onChange }: { value: When; onChange: (w: When) => void }) {
  return <Chips label="Quand" scroll options={WHEN} value={value} onChange={(v) => v && onChange(v)} />;
}

export function FilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className="filter-btn" onClick={onClick} aria-label={`Filtres${count ? `, ${count} actifs` : ''}`}>
      <SlidersHorizontal size={17} aria-hidden />
      Filtres
      {count ? <span className="filter-btn__count">{count}</span> : null}
    </button>
  );
}

/** Filtres actifs sous forme de pastilles, chacune retirable d'un clic. */
export function ActiveFilters({ f, hasCoords, onChange }: { f: Filters; hasCoords: boolean; onChange: (f: Filters) => void }) {
  const pills: { key: string; label: string; reset: Partial<Filters> }[] = [];
  if (f.format) pills.push({ key: 'format', label: FORMATS.find((x) => x.value === f.format)?.label ?? f.format, reset: { format: null } });
  if (f.level) pills.push({ key: 'level', label: LEVELS[f.level - 1]!, reset: { level: null } });
  if (hasCoords && f.radius !== DEFAULT_FILTERS.radius) pills.push({ key: 'radius', label: `${f.radius} km`, reset: { radius: DEFAULT_FILTERS.radius } });
  if (f.onlyOpen) pills.push({ key: 'open', label: 'Places libres', reset: { onlyOpen: false } });
  if (hasCoords && f.sort === 'date') pills.push({ key: 'sort', label: 'Par date', reset: { sort: 'distance' } });
  if (!pills.length) return null;
  return (
    <div className="active-filters">
      {pills.map((p) => (
        <button key={p.key} type="button" className="active-filter" onClick={() => onChange({ ...f, ...p.reset })} aria-label={`Retirer le filtre ${p.label}`}>
          {p.label}
          <X size={14} aria-hidden />
        </button>
      ))}
      {pills.length > 1 ? (
        <button type="button" className="active-filter active-filter--clear" onClick={() => onChange({ ...DEFAULT_FILTERS, when: f.when })}>
          Tout effacer
        </button>
      ) : null}
    </div>
  );
}

/** Fenêtre de filtres : on règle tout, puis on applique d'un coup. */
export function FilterSheet({ open, value, hasCoords, onApply, onClose }: { open: boolean; value: Filters; hasCoords: boolean; onApply: (f: Filters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtres"
      right={
        <button type="button" className="link" onClick={() => setDraft({ ...DEFAULT_FILTERS, when: draft.when })}>
          Réinitialiser
        </button>
      }
      footer={
        <Button
          block
          onClick={() => {
            onApply(draft);
            onClose();
          }}
        >
          Appliquer
        </Button>
      }
    >
      <Label>Format</Label>
      <Chips label="Format" options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={draft.format} onChange={(v) => set({ format: v })} allowEmpty />
      <Label>Niveau</Label>
      <Chips label="Niveau" options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={draft.level} onChange={(v) => set({ level: v })} allowEmpty />
      <Label>Distance maximum</Label>
      {hasCoords ? (
        <Chips label="Distance" options={RADII.map((r) => ({ value: r, label: `${r} km` }))} value={draft.radius} onChange={(v) => v && set({ radius: v })} />
      ) : (
        <p className="sub">Active la localisation ou choisis un lieu pour filtrer par distance.</p>
      )}
      {hasCoords ? (
        <>
          <Label>Trier par</Label>
          <Chips
            label="Tri"
            options={[
              { value: 'distance', label: 'Les plus proches' },
              { value: 'date', label: 'Les plus tôt' },
            ]}
            value={draft.sort}
            onChange={(v) => v && set({ sort: v as Filters['sort'] })}
          />
        </>
      ) : null}
      <Switch title="Places libres uniquement" text="Masque les matchs complets." checked={draft.onlyOpen} onChange={(v) => set({ onlyOpen: v })} />
    </Sheet>
  );
}
