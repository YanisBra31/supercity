// Formulaire de l'espace pro : nom, type de structure, forme juridique, ville, présentation.
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Chips, ErrorText, Field, Label, s } from './ui';
import { ApiError, LegalForm, MyOrganization, OrgKind } from '../lib/api';
import { LEGAL_FORMS, ORG_KINDS } from '../lib/format';

export type OrgInput = { name: string; kind: OrgKind; legal_form: LegalForm; city: string | null; description: string | null };

export function OrgForm({ org, submitLabel, onSubmit }: { org?: MyOrganization; submitLabel: string; onSubmit: (v: OrgInput) => Promise<void> }) {
  const [name, setName] = useState(org?.name ?? '');
  const [kind, setKind] = useState<OrgKind | null>(org?.kind ?? null);
  const [legal, setLegal] = useState<LegalForm | null>(org?.legal_form ?? null);
  const [city, setCity] = useState(org?.city ?? '');
  const [description, setDescription] = useState(org?.description ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = !!org?.payouts.connected;

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) return setError('Donne le nom de ta structure.');
    if (!kind) return setError('Choisis le type de structure.');
    if (!legal) return setError('Choisis la forme juridique.');
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), kind, legal_form: legal, city: city.trim() || null, description: description.trim() || null });
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Nom de la structure" value={name} onChangeText={setName} maxLength={80} placeholder="Five Toulouse Nord, AS Bagatelle…" />
      <Label>Type</Label>
      <Chips options={ORG_KINDS} value={kind} onChange={setKind} />
      <Label>Forme juridique</Label>
      {locked ? (
        <Text style={s.sub}>{LEGAL_FORMS.find((l) => l.value === legal)?.label}, déjà déclarée à Stripe.</Text>
      ) : (
        <Chips options={LEGAL_FORMS} value={legal} onChange={setLegal} />
      )}
      <Field label="Ville" value={city} onChangeText={setCity} maxLength={80} />
      <Field label="Présentation" value={description} onChangeText={setDescription} maxLength={500} multiline placeholder="Terrains, horaires, ce qui est fourni…" style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} icon="briefcase-outline" onPress={submit} loading={busy} />
    </>
  );
}
