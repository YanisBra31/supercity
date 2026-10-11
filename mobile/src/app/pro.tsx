// Espace pro : un five, un club, une association ou un coach publie des matchs et des tournois payants.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Hero } from '../components/brand';
import { OrgForm, OrgInput } from '../components/OrgForm';
import { Button, Card, colors, ErrorText, font, Kicker, Loading, s, Screen } from '../components/ui';
import { ApiError, get, MyOrganization, patch, post } from '../lib/api';
import { orgKindLabel } from '../lib/format';
import { euros, openStripe, returnUrl } from '../lib/pay';

function Step({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={[s.row, { gap: 10, alignItems: 'flex-start' }]}>
      <Ionicons name={icon} size={18} color={colors.orange2} style={{ marginTop: 1 }} />
      <Text style={[s.sub, { flex: 1, color: colors.ink }]}>{text}</Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 14 }}>
      <Text style={{ ...font.black, fontSize: 20, color: colors.ink }}>{value}</Text>
      <Text style={[s.sub, { fontSize: 12, textAlign: 'center' }]}>{label}</Text>
    </Card>
  );
}

export default function ProScreen() {
  const [org, setOrg] = useState<MyOrganization | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrg((await get<{ organization: MyOrganization | null }>('/me/organization')).organization);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = async (v: OrgInput) => {
    const res = org ? await patch<{ organization: MyOrganization }>('/me/organization', v) : await post<{ organization: MyOrganization }>('/me/organization', v);
    setOrg(res.organization);
    setEditing(false);
  };

  const open = async (path: string) => {
    setBusy(true);
    setError('');
    try {
      const { url } = await post<{ url: string }>(path, { return_url: returnUrl('pro') });
      await openStripe(url, returnUrl('pro'));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ouverture impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (org === undefined) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  if (!org) {
    return (
      <Screen>
        <Hero kicker="Espace pro" title="Remplis tes terrains" sub="Pour les fives, clubs, associations et coachs : publie des créneaux et des tournois payants, les joueurs réservent et paient dans l'appli." />
        <Card style={{ gap: 12 }}>
          <Step icon="briefcase-outline" text="Crée l'espace de ta structure, puis active les paiements : Stripe vérifie ta structure (SIRET ou RNA) et ton RIB, une seule fois." />
          <Step icon="trophy-outline" text="Publie des matchs ou des tournois jusqu'à 200 joueurs, au prix que tu choisis." />
          <Step icon="phone-portrait-outline" text="Les joueurs paient par carte, Apple Pay ou Google Pay, sans rien avoir à créer." />
          <Step icon="cash-outline" text="Tu reçois le prix des places par virement, moins la commission Supercity." />
        </Card>
        <Kicker>Ta structure</Kicker>
        <OrgForm submitLabel="Créer mon espace pro" onSubmit={save} />
      </Screen>
    );
  }

  const p = org.payouts;
  return (
    <Screen>
      <Hero kicker={`Espace pro · ${orgKindLabel(org.kind)}`} title={org.name} sub={org.city ?? undefined} />

      <View style={[s.row, { gap: 10 }]}>
        <Stat value={String(org.stats.places_sold)} label="places vendues" />
        <Stat value={euros(org.stats.net_cents)} label="pour toi" />
        <Stat value={String(org.stats.upcoming)} label="à venir" />
      </View>

      <Card style={{ gap: 12 }}>
        <View style={[s.row, { gap: 10 }]}>
          <Ionicons name={p.ready ? 'checkmark-circle' : 'card-outline'} size={26} color={p.ready ? colors.success : colors.orange2} />
          <Text style={{ ...font.extrabold, fontSize: 18, color: colors.ink, flex: 1 }}>
            {p.ready ? 'Tu peux encaisser' : p.connected ? 'Vérification en cours chez Stripe' : 'Active les paiements'}
          </Text>
        </View>
        <Step icon="phone-portrait-outline" text={`Chaque joueur paie le prix de la place, plus ${euros(p.fee_cents)} de frais de service.`} />
        <Step icon="cash-outline" text={`Tu reçois le prix moins ${String(p.commission_percent).replace('.', ',')} % de commission Supercity, par virement Stripe.`} />
        <Step icon="refresh-outline" text={`Un joueur qui se désiste plus de ${p.refund_hours} h avant est remboursé. Si tu annules, tout le monde est remboursé.`} />
        {!p.enabled ? (
          <Text style={s.sub}>Le paiement en ligne n'est pas encore activé sur Supercity.</Text>
        ) : p.ready ? (
          <Button title="Voir mes virements" icon="open-outline" variant="dark" loading={busy} onPress={() => open('/me/organization/dashboard')} />
        ) : (
          <>
            <Button title={p.connected ? 'Terminer mon inscription Stripe' : 'Activer les paiements'} icon="card-outline" loading={busy} onPress={() => open('/me/organization/onboard')} />
            <Text style={s.sub}>Stripe te demande les infos de ta structure et son RIB, une seule fois.</Text>
          </>
        )}
        <ErrorText>{error}</ErrorText>
      </Card>

      <Button title="Publier un match ou un tournoi" icon="megaphone-outline" onPress={() => router.push('/create')} />
      <Button title="Voir ma page publique" icon="eye-outline" variant="ghost" onPress={() => router.push(`/org/${org.id}`)} />

      <Kicker>Ta structure</Kicker>
      {editing ? (
        <OrgForm org={org} submitLabel="Enregistrer" onSubmit={save} />
      ) : (
        <Button title="Modifier les infos" icon="create-outline" variant="ghost" onPress={() => setEditing(true)} />
      )}
    </Screen>
  );
}
