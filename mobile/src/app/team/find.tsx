// Trouver une équipe à défier.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, colors, Empty, Field, font, Pill, s, Screen, TeamCrest } from '../../components/ui';
import { get, Team } from '../../lib/api';

export default function FindTeam() {
  const { match } = useLocalSearchParams<{ match?: string }>();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Team[] | null>(null);

  const load = useCallback(async (search: string) => {
    const r = await get<{ items: Team[] }>('/teams', { q: search, limit: 30 }).catch(() => ({ items: [] as Team[] }));
    setItems(r.items.filter((t) => !t.my_role));
  }, []);
  useEffect(() => {
    load('');
  }, [load]);

  return (
    <Screen>
      <Field label="Chercher une équipe" value={q} onChangeText={(t) => { setQ(t); load(t); }} placeholder="Nom de l'équipe" />
      {items?.length === 0 ? <Empty icon="search-outline" title="Aucune équipe trouvée" text="Essaie un autre nom." /> : null}
      {items?.map((t, i) => (
        <Card key={t.id} index={i} onPress={() => router.push(`/team/${t.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...font.extrabold, fontSize: 16, color: colors.ink }}>{t.name}</Text>
            <Text style={s.sub}>
              {t.members_count} joueur{t.members_count > 1 ? 's' : ''}
              {t.city ? ` · ${t.city}` : ''}
            </Text>
            {t.recruiting ? <Pill text="Recrute" tone="green" /> : null}
          </View>
          <Button
            title="Défier"
            icon="flash"
            onPress={() => router.push({ pathname: '/challenge/new', params: { to: String(t.id), ...(match ? { match } : {}) } })}
            style={{ paddingHorizontal: 4 }}
          />
        </Card>
      ))}
    </Screen>
  );
}
