// Choix d'une couleur : pastilles rondes, la sélection est entourée. Et les couleurs proposées aux équipes.
import { Check } from 'lucide-react';

export function Swatches<T extends string>({ options, value, onChange, label }: { options: { value: T; stops: readonly string[]; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        const light = o.stops[0]!.toLowerCase() === '#ffffff';
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} aria-label={o.label} title={o.label} className="swatch" onClick={() => onChange(o.value)}>
            <span style={{ background: o.stops.length > 1 ? `linear-gradient(135deg, ${o.stops.join(', ')})` : o.stops[0] }}>
              {on ? <Check size={18} color={light ? '#1f1a17' : '#fff8f1'} aria-hidden /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Couleurs proposées aux équipes (maillot principal et secondaire).
export const TEAM_COLORS = [
  { value: '#ff5223', label: 'Orange' },
  { value: '#ff9417', label: 'Ambre' },
  { value: '#e53935', label: 'Rouge' },
  { value: '#8e1b3a', label: 'Bordeaux' },
  { value: '#ec407a', label: 'Rose' },
  { value: '#7e57c2', label: 'Violet' },
  { value: '#1e88e5', label: 'Bleu' },
  { value: '#0d2c6b', label: 'Marine' },
  { value: '#29b6f6', label: 'Ciel' },
  { value: '#2e9d4f', label: 'Vert' },
  { value: '#c0ca33', label: 'Citron' },
  { value: '#fdd835', label: 'Jaune' },
  { value: '#1f1a17', label: 'Noir' },
  { value: '#9e9e9e', label: 'Gris' },
  { value: '#ffffff', label: 'Blanc' },
];
