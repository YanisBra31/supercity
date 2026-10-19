// Champ d'adresse avec suggestions au fil de la frappe (flèches et Entrée au clavier), et fenêtre « Autour de » pour choisir où chercher.
import { Building2, ChevronDown, Home, LocateFixed, MapPin, Navigation, Search, Volleyball, Waypoints, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Place, searchAddress, searchPlaces } from '../lib/address';
import { Coords } from '../lib/location';
import { Icon, Sheet } from './ui';

const ICONS: Record<Place['kind'], Icon> = {
  housenumber: Home,
  street: Waypoints,
  locality: MapPin,
  municipality: Building2,
  poi: Volleyball,
};

const subLine = (p: Place) =>
  [p.kind === 'poi' && p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : null, [p.postcode, p.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

export function AddressSearch({
  label,
  placeholder = 'Adresse, rue ou ville',
  near,
  initial = '',
  autoFocus,
  places,
  onSelect,
  onChangeText,
}: {
  label?: string;
  placeholder?: string;
  near?: Coords | null;
  initial?: string;
  autoFocus?: boolean;
  /** Cherche aussi les lieux par leur nom (stades, gymnases...), pas seulement les adresses. */
  places?: boolean;
  onSelect: (p: Place) => void;
  /** Le texte tapé, pour chercher en parallèle ailleurs (terrains déjà sur Supercity). */
  onChangeText?: (q: string) => void;
}) {
  const id = useId();
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const picked = useRef(initial);
  const input = useRef<HTMLInputElement>(null);

  // Dans une fenêtre, le navigateur place le focus sur le premier bouton : on le remet dans le champ.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [autoFocus]);

  // Attend une courte pause dans la frappe, et annule la recherche précédente.
  useEffect(() => {
    if (q === picked.current || q.trim().length < 3) {
      setItems([]);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      (places ? searchPlaces : searchAddress)(q, near, ctrl.signal)
        .then((r) => {
          setItems(r);
          setActive(-1);
          setFailed(false);
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') setFailed(true);
        })
        .finally(() => setBusy(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, near?.lat, near?.lng]);

  const pick = (p: Place) => {
    picked.current = p.label;
    setQ(p.label);
    setItems([]);
    onSelect(p);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(items[active]!);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setItems([]);
    }
  };

  const waiting = q.trim().length >= 3 && q !== picked.current;
  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="field__box">
        <Search size={18} aria-hidden style={{ color: 'var(--dim)', flexShrink: 0 }} />
        <input
          ref={input}
          id={id}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChangeText?.(e.target.value);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label ? undefined : placeholder}
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        />
        {busy ? <span className="spinner" aria-hidden style={{ color: 'var(--orange-2)' }} /> : null}
        {q && !busy ? (
          <button
            type="button"
            className="link"
            style={{ color: 'var(--dim)', display: 'grid' }}
            aria-label="Effacer"
            onClick={() => {
              setQ('');
              onChangeText?.('');
            }}
          >
            <X size={18} />
          </button>
        ) : null}
      </div>
      {items.length ? (
        <ul className="addr__list" id={`${id}-list`} role="listbox">
          {items.map((p, i) => {
            const I = ICONS[p.kind] ?? MapPin;
            return (
              <li key={`${p.label}-${i}`} id={`${id}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" className={`addr__item${i === active ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                  <I size={18} aria-hidden />
                  <span className="grow">
                    <b className="ellipsis">{p.name}</b>
                    <span className="ellipsis">{subLine(p)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : waiting && !busy ? (
        <p className="field__hint">{failed ? 'Recherche indisponible, vérifie ta connexion.' : places ? "Aucun lieu trouvé : essaie avec l'adresse ou la ville." : 'Aucune adresse trouvée.'}</p>
      ) : null}
    </div>
  );
}

/** Fenêtre pour choisir où chercher : une ville ou une adresse, ou la position du navigateur. */
export function PlaceSheet({ open, near, onPick, onClose }: { open: boolean; near?: Coords | null; onPick: (p: Place | null) => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Chercher autour de…">
      <button
        type="button"
        className="card row place-mine"
        onClick={() => {
          onPick(null);
          onClose();
        }}
      >
        <LocateFixed size={18} aria-hidden />
        <b>Ma position actuelle</b>
      </button>
      <AddressSearch
        placeholder="Ville, quartier ou adresse"
        near={near}
        autoFocus
        onSelect={(p) => {
          onPick(p);
          onClose();
        }}
      />
      <div style={{ minHeight: 160 }} />
    </Sheet>
  );
}

/** Pastille « Autour de … » qui ouvre la fenêtre. */
export function PlaceButton({ place, hasCoords, onClick }: { place: Place | null; hasCoords: boolean; onClick: () => void }) {
  const text = place ? (place.kind === 'municipality' ? place.label : place.name) : hasCoords ? 'Ma position' : 'Choisir un lieu';
  const I = place ? MapPin : Navigation;
  return (
    <button type="button" className="place-btn" onClick={onClick} aria-label={`Chercher autour de ${text}, modifier`}>
      <I size={16} aria-hidden />
      <span className="ellipsis">
        Autour de <b>{text}</b>
      </span>
      <ChevronDown size={16} aria-hidden />
    </button>
  );
}
