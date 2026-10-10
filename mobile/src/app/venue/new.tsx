// Ajouter un terrain à la position actuelle du joueur.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Chips, colors, ErrorText, Field, Label, s, Screen } from '../../components/ui';
import { ApiError, post, Surface, Venue } from '../../lib/api';
import { SURFACES } from '../../lib/format';
import { Coords, getPosition } from '../../lib/location';
import { setLastVenue } from '../../lib/venueStore';

export default function NewVenue() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [surface, setSurface] = useState<Surface>('city');
  const [covered, setCovered] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const locate = async () => {
    setLocating(true);
    setCoords(await getPosition());
    setLocating(false);
  };
  useEffect(() => {
    locate();
  }, []);

  const submit = async () => {
    setError('');
    setFields({});
    if (!coords) return setError('Active la localisation : le terrain est placé à ta position actuelle.');
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
      <Text style={s.sub}>Sois sur place (ou tout près) : le terrain est placé à ta position actuelle sur la carte.</Text>
      <Field label="Nom du terrain" value={name} onChangeText={setName} error={fields.name} placeholder="City stade de la Reynerie" />
      <Field label="Adresse" value={address} onChangeText={setAddress} error={fields.address} placeholder="Rue, code postal, ville" />
      <Field label="Ville" value={city} onChangeText={setCity} error={fields.city} />
      <Label>Surface</Label>
      <Chips options={SURFACES} value={surface} onChange={(v) => v && setSurface(v)} />
      <Label>Couvert</Label>
      <Chips options={[{ value: 'non', label: 'En plein air' }, { value: 'oui', label: 'Couvert' }]} value={covered ? 'oui' : 'non'} onChange={(v) => setCovered(v === 'oui')} />
      <Text style={[s.sub, { color: coords ? colors.success : colors.dim }]}>
        {locating ? 'Localisation en cours…' : coords ? `Position trouvée (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Position introuvable.'}
      </Text>
      {!coords && !locating ? <Button title="Réessayer la localisation" variant="ghost" onPress={locate} /> : null}
      <ErrorText>{error}</ErrorText>
      <Button title="Ajouter le terrain" onPress={submit} loading={loading} />
    </Screen>
  );
}
