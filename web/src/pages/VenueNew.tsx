// Ajouter un terrain : on le cherche par son nom (« Parc des Princes ») ou son adresse, ou, sur place, on prend la position du navigateur.
// Les terrains déjà sur Supercity qui correspondent sont proposés en premier, pour éviter les doublons.
import { CheckCircle2, LocateFixed, Volleyball } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Place } from '../lib/address';
import { ApiError, get, post, Surface, Venue } from '../lib/api';
import { SURFACES } from '../lib/format';
import { Coords, getPosition, getSearchCenter } from '../lib/location';
import { AddressSearch } from '../ui/AddressSearch';
import { Page, useBack } from '../ui/Layout';
import { setLastVenue } from '../ui/match/venueStore';
import { Button, Card, Chips, ErrorText, Field, Label } from '../ui/ui';

export default function VenueNew() {
  const back = useBack('/create');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [surface, setSurface] = useState<Surface>('city');
  const [covered, setCovered] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [source, setSource] = useState<'address' | 'gps' | null>(null);
  const [near, setNear] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState<Venue[]>([]);

  // Les suggestions d'adresse privilégient le coin où le joueur cherche.
  useEffect(() => {
    getSearchCenter().then((c) => setNear(c.coords));
  }, []);

  // Terrains déjà sur Supercity dont le nom ou l'adresse correspond à la recherche.
  const searchKnown = (q: string) => {
    if (q.trim().length < 3) return setKnown([]);
    get<{ items: Venue[] }>('/venues', { q: q.trim(), limit: 3 })
      .then((r) => setKnown(r.items.slice(0, 3)))
      .catch(() => setKnown([]));
  };

  const choose = (v: Venue) => {
    setLastVenue(v);
    back();
  };

  const fromAddress = (p: Place) => {
    if (p.kind === 'poi') setName((n) => n || p.name);
    setAddress(p.kind === 'housenumber' || p.kind === 'street' ? p.name : p.label);
    setCity(p.city ?? '');
    setCoords({ lat: p.lat, lng: p.lng });
    setSource('address');
    setError('');
  };

  const fromGps = async () => {
    setLocating(true);
    const pos = await getPosition();
    setLocating(false);
    if (!pos) return setError('Position introuvable : autorise la localisation dans ton navigateur ou cherche le terrain.');
    setCoords(pos);
    setSource('gps');
    setError('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFields({});
    if (!coords) return setError('Cherche le terrain par son nom ou son adresse pour le placer sur la carte.');
    setLoading(true);
    try {
      choose(await post<Venue>('/venues', { name, address, city: city || null, surface, covered, lat: coords.lat, lng: coords.lng }));
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        if (!Object.keys(err.fields).length) setError(err.message);
      } else setError('Ajout impossible.');
      setLoading(false);
    }
  };

  return (
    <Page title="Ajouter un terrain" back="/create">
      <AddressSearch label="Cherche le terrain" placeholder="Nom du stade ou adresse" near={near} places autoFocus onSelect={fromAddress} onChangeText={searchKnown} />
      {known.length ? (
        <div className="stack" style={{ gap: 8 }}>
          <p className="sub" style={{ fontWeight: 600 }}>
            Déjà sur Supercity :
          </p>
          {known.map((v) => (
            <Card key={v.id} onClick={() => choose(v)} className="row" style={{ display: 'flex', gap: 12 }}>
              <Volleyball size={20} aria-hidden style={{ color: 'var(--orange-2)', flexShrink: 0 }} />
              <span className="grow">
                <b style={{ display: 'block' }}>{v.name}</b>
                <span className="sub ellipsis" style={{ display: 'block' }}>
                  {v.address}
                </span>
              </span>
              <span className="link" style={{ fontWeight: 600 }}>
                Choisir
              </span>
            </Card>
          ))}
        </div>
      ) : null}
      <Button variant="ghost" icon={LocateFixed} onClick={fromGps} loading={locating}>
        {locating ? 'Localisation…' : 'Je suis sur place'}
      </Button>

      {coords ? (
        <p className="row" style={{ gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
          <CheckCircle2 size={18} aria-hidden />
          {source === 'gps' ? 'Placé à ta position actuelle.' : 'Placé à cette adresse sur la carte.'}
        </p>
      ) : null}

      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <Field label="Nom du terrain" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} placeholder="City stade de la Reynerie" required />
        <Field label="Adresse affichée" value={address} onChange={(e) => setAddress(e.target.value)} error={fields.address} placeholder="12 rue des Sports" />
        <Field label="Ville" value={city} onChange={(e) => setCity(e.target.value)} error={fields.city} />
        <Label>Surface</Label>
        <Chips label="Surface" options={SURFACES} value={surface} onChange={(v) => v && setSurface(v)} />
        <Label>Couvert</Label>
        <Chips
          label="Couvert"
          options={[
            { value: 'non', label: 'En plein air' },
            { value: 'oui', label: 'Couvert' },
          ]}
          value={covered ? 'oui' : 'non'}
          onChange={(v) => v && setCovered(v === 'oui')}
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} block>
          Ajouter le terrain
        </Button>
      </form>
    </Page>
  );
}
