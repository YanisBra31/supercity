// Page publique d'un espace pro : présentation et matchs ou tournois à venir.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Hero } from '../../components/brand';
import { MatchCard } from '../../components/MatchCard';
import { colors, Empty, ErrorText, Label, Loading, s, Screen } from '../../components/ui';
import { ApiError, get, Match, OrgSummary } from '../../lib/api';
import { orgKindLabel } from '../../lib/format';

export default function OrgPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [org, setOrg] = useState<(OrgSummary & { matches: Match[] }) | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get<OrgSummary & { matches: Match[] }>(`/organizations/${id}`)
      .then(setOrg)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Page introuvable.'));
  }, [id]);

  if (!org) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: org.name }} />
      <Hero kicker={`Pro · ${orgKindLabel(org.kind)}`} title={org.name} sub={org.city ?? undefined} />
      {org.description ? <Text style={[s.sub, { color: colors.ink }]}>{org.description}</Text> : null}
      <Label>À venir</Label>
      {org.matches.length ? (
        org.matches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)
      ) : (
        <Empty icon="calendar-outline" title="Rien de prévu pour l'instant" text="Reviens bientôt pour les prochains créneaux et tournois." />
      )}
    </Screen>
  );
}
