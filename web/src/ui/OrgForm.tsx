// Formulaire de l'espace pro : nom, type de structure, forme juridique, ville, présentation.
import { Briefcase } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ApiError, LegalForm, MyOrganization, OrgKind } from '../lib/api';
import { LEGAL_FORMS, ORG_KINDS } from '../lib/format';
import { Button, Chips, ErrorText, Field, Label, TextArea } from './ui';

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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Donne le nom de ta structure.');
    if (!kind) return setError('Choisis le type de structure.');
    if (!legal) return setError('Choisis la forme juridique.');
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), kind, legal_form: legal, city: city.trim() || null, description: description.trim() || null });
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
      <Field label="Nom de la structure" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Five Toulouse Nord, AS Bagatelle…" autoComplete="organization" />
      <Label>Type</Label>
      <Chips label="Type" options={ORG_KINDS} value={kind} onChange={setKind} />
      <Label>Forme juridique</Label>
      {locked ? (
        <p className="sub">{LEGAL_FORMS.find((l) => l.value === legal)?.label}, déjà déclarée à Stripe.</p>
      ) : (
        <Chips label="Forme juridique" options={LEGAL_FORMS} value={legal} onChange={setLegal} />
      )}
      <Field label="Ville" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} autoComplete="address-level2" />
      <TextArea label="Présentation" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} placeholder="Terrains, horaires, ce qui est fourni…" />
      <ErrorText>{error}</ErrorText>
      <Button type="submit" icon={Briefcase} loading={busy} block>
        {submitLabel}
      </Button>
    </form>
  );
}
