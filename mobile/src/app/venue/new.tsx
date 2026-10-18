// Ajouter un terrain : on le cherche par son nom (« Parc des Princes ») ou son adresse, ou, sur place, on prend la position du téléphone.
// Les terrains déjà sur Supercity qui correspondent sont proposés en premier, pour éviter les doublons.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { AddressSearch } from '../../components/AddressSearch';
import { Button, Card, Chips, colors, ErrorText, Field, font, Label, s, Screen } from '../../components/ui';
import { ApiError, get, post, Surface, Venue } from '../../lib/api';
import { Place } from '../../lib/address';
import { SURFACES } from '../../lib/format';
import { Coords, getPosition, getSearchCenter } from '../../lib/location';
import { setLastVenue } from '../../lib/venueStore';

export default function NewVenue() {
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

  // Les suggestions d'adresse privilégient le coin où le joueur cherche.
  useEffect(() => {
    getSearchCenter().then((c) => setNear(c.coords));
  }, []);

  // Terrains déjà sur Supercity dont le nom ou l'adresse correspond à la recherche.
  const [known, setKnown] = useState<Venue[]>([]);
  const searchKnown = (q: string) => {
    if (q.trim().length < 3) return setKnown([]);
    get<{ items: Venue[] }>('/venues', { q: q.trim(), limit: 3 })
      .then((r) => setKnown(r.items.slice(0, 3)))
      .catch(() => setKnown([]));
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
    if (!pos) return setError('Position introuvable : autorise la localisation ou cherche le terrain.');
    setCoords(pos);
    setSource('gps');
    setError('');
  };

  const submit = async () => {
    setError('');
    setFields({});
    if (!coords) return setError('Cherche le terrain par son nom ou son adresse pour le placer sur la carte.');
    setLoading(true);
    try {
      const v = await post<Venue>('/venues', { name, address, city: city || null, surface, covered, lat: coords.lat, lng: coords.lng });
      setLastVenue(v);
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        if (!Object.keys(e.fields).length) setError(e.message);
      } else setError('Ajout impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AddressSearch
        label="Cherche le terrain"
        placeholder="Nom du stade ou adresse"
        near={near}
        places
        onSelect={fromAddress}
        onChangeText={searchKnown}
      />
      {known.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[s.sub, font.semibold]}>Déjà sur Supercity :</Text>
          {known.map((v) => (
            <Card
              key={v.id}
              onPress={() => {
                setLastVenue(v);
                router.back();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Ionicons name="football" size={20} color={colors.orange2} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.bold, color: colors.ink }}>{v.name}</Text>
                <Text style={s.sub} numberOfLines={1}>{v.address}</Text>
              </View>
              <Text style={{ ...font.semibold, color: colors.orange2 }}>Choisir</Text>
            </Card>
          ))}
        </View>
      ) : null}
      <Button title={locating ? 'Localisation…' : 'Je suis sur place'} variant="ghost" icon="navigate-outline" onPress={fromGps} loading={locating} />

      {coords ? (
        <View style={[s.row, { gap: 8 }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[s.sub, { color: colors.success, flex: 1, ...font.semibold }]}>
            {source === 'gps' ? 'Placé à ta position actuelle.' : 'Placé à cette adresse sur la carte.'}
          </Text>
        </View>
      ) : null}

      <Field label="Nom du terrain" value={name} onChangeText={setName} error={fields.name} placeholder="City stade de la Reynerie" />
      <Field label="Adresse affichée" value={address} onChangeText={setAddress} error={fields.address} placeholder="12 rue des Sports" />
      <Field label="Ville" value={city} onChangeText={setCity} error={fields.city} />
      <Label>Surface</Label>
      <Chips options={SURFACES} value={surface} onChange={(v) => v && setSurface(v)} />
      <Label>Couvert</Label>
      <Chips options={[{ value: 'non', label: 'En plein air' }, { value: 'oui', label: 'Couvert' }]} value={covered ? 'oui' : 'non'} onChange={(v) => setCovered(v === 'oui')} />
      <ErrorText>{error}</ErrorText>
      <Button title="Ajouter le terrain" onPress={submit} loading={loading} />
    </Screen>
  );
}
