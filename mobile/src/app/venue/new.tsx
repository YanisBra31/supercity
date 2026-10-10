// Ajouter un terrain : on cherche son adresse (ou, sur place, on prend la position du téléphone).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { AddressSearch } from '../../components/AddressSearch';
import { Button, Chips, colors, ErrorText, Field, font, Label, s, Screen } from '../../components/ui';
import { ApiError, post, Surface, Venue } from '../../lib/api';
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

  const fromAddress = (p: Place) => {
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
    if (!pos) return setError('Position introuvable : autorise la localisation ou cherche l’adresse.');
    setCoords(pos);
    setSource('gps');
    setError('');
  };

  const submit = async () => {
    setError('');
    setFields({});
    if (!coords) return setError('Cherche l’adresse du terrain pour le placer sur la carte.');
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
      <Field label="Nom du terrain" value={name} onChangeText={setName} error={fields.name} placeholder="City stade de la Reynerie" />
      <AddressSearch label="Adresse du terrain" placeholder="Rue, code postal ou ville" near={near} onSelect={fromAddress} />
      <Button title={locating ? 'Localisation…' : 'Je suis sur place : utiliser ma position'} variant="ghost" icon="navigate-outline" onPress={fromGps} loading={locating} />

      {coords ? (
        <View style={[s.row, { gap: 8 }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[s.sub, { color: colors.success, flex: 1, ...font.semibold }]}>
            {source === 'gps' ? 'Placé à ta position actuelle.' : 'Placé à cette adresse sur la carte.'}
          </Text>
        </View>
      ) : null}

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
