// Paiements de l'organisateur : relier son compte Stripe pour encaisser les matchs payants.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, colors, ErrorText, font, Loading, s, Screen } from '../components/ui';
import { ApiError, get, Payouts, post } from '../lib/api';
import { euros, openStripe, returnUrl } from '../lib/pay';

function Step({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={[s.row, { gap: 10, alignItems: 'flex-start' }]}>
      <Ionicons name={icon} size={18} color={colors.orange2} style={{ marginTop: 1 }} />
      <Text style={[s.sub, { flex: 1, color: colors.ink }]}>{text}</Text>
    </View>
  );
}

export default function PayoutsScreen() {
  const [p, setP] = useState<Payouts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setP(await get<Payouts>('/me/payouts'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = async (path: string) => {
    setBusy(true);
    setError('');
    try {
      const { url } = await post<{ url: string }>(path, { return_url: returnUrl('payouts') });
      await openStripe(url, returnUrl('payouts'));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ouverture impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!p) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <View style={[s.row, { gap: 10 }]}>
          <Ionicons name={p.ready ? 'checkmark-circle' : 'card-outline'} size={26} color={p.ready ? colors.success : colors.orange2} />
          <Text style={{ ...font.extrabold, fontSize: 18, color: colors.ink, flex: 1 }}>
            {p.ready ? 'Tu peux encaisser tes matchs' : p.connected ? 'Vérification en cours' : 'Fais payer la place de tes matchs'}
          </Text>
        </View>
        <Step icon="pricetag-outline" text="Tu fixes le prix de la place en créant le match, par exemple ta part de la location du terrain." />
        <Step icon="phone-portrait-outline" text={`Chaque joueur paie en s'inscrivant, plus ${euros(p.fee_cents)} de frais de service Supercity.`} />
        <Step icon="cash-outline" text="Tu reçois le prix de chaque place sur ton compte bancaire, par virement Stripe." />
        <Step icon="refresh-outline" text={`Un joueur qui se désiste plus de ${p.refund_hours} h avant est remboursé. Si tu annules le match, tout le monde est remboursé.`} />
      </Card>

      {!p.enabled ? (
        <Text style={s.sub}>Le paiement en ligne n'est pas encore activé sur Supercity.</Text>
      ) : p.ready ? (
        <Button title="Voir mes virements" icon="open-outline" variant="dark" loading={busy} onPress={() => open('/me/payouts/dashboard')} />
      ) : (
        <>
          <Button title={p.connected ? 'Terminer mon inscription Stripe' : 'Activer les paiements'} icon="card-outline" loading={busy} onPress={() => open('/me/payouts/onboard')} />
          <Text style={s.sub}>Stripe te demande ton identité et ton RIB, une seule fois. Ça prend environ 5 minutes.</Text>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
