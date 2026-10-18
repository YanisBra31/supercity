// Mes amis : demandes reçues, amis triés par statut (en match, en ligne, hors ligne), recherche pour en ajouter.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FriendRow, sendFriend } from '../components/Friends';
import { Button, colors, Empty, ErrorText, font, IconButton, Kicker, Loading, Pill, s } from '../components/ui';
import { ApiError, Friendship, Friends as FriendsData, get, PublicUser } from '../lib/api';
import { shareMessage, webUrl } from '../lib/links';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';

type Found = PublicUser & { friendship: Friendship };

function SmallButton({ title, icon, onPress, ghost }: { title: string; icon?: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [st.small, ghost && st.smallGhost, pressed && { opacity: 0.8 }]}>
      {icon ? <Ionicons name={icon} size={15} color={ghost ? colors.ink : colors.chalk} /> : null}
      <Text style={[st.smallText, ghost && { color: colors.ink }]}>{title}</Text>
    </Pressable>
  );
}

export default function Friends() {
  const { user } = useAuth();
  const [data, setData] = useState<FriendsData | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await get<FriendsData>('/me/friends');
      setData(r);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Liste d\'amis indisponible.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Recherche au fil de la frappe, à partir de 2 lettres.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setFound(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      get<{ items: Found[] }>('/users', { q: term })
        .then((r) => setFound(r.items))
        .catch(() => setFound([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (id: number, add: boolean) => {
    setError('');
    try {
      const f = await sendFriend(id, add);
      setFound((prev) => prev?.map((u) => (u.id === id ? { ...u, friendship: f } : u)) ?? null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    }
  };

  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (!user) return;
    if ((await shareMessage(`Ajoute-moi sur Supercity, je suis ${user.display_name} : ${webUrl(`user/${user.id}`)}`)) === 'copied') setCopied(true);
  };

  if (!data) return error ? <View style={s.screen}><ErrorText>{error}</ErrorText></View> : <Loading />;

  const inMatch = data.friends.filter((f) => f.presence?.state === 'match');
  const online = data.friends.filter((f) => f.presence?.state === 'online');
  const rest = data.friends.filter((f) => !f.presence || f.presence.state === 'offline');
  const groups: [string, typeof data.friends][] = [
    [`En match · ${inMatch.length}`, inMatch],
    [`En ligne · ${online.length}`, online],
    [inMatch.length || online.length ? `Hors ligne · ${rest.length}` : `Mes amis · ${rest.length}`, rest],
  ];

  const searchAction = (u: Found) => {
    switch (u.friendship) {
      case 'friends':
        return <Pill text="Ami" tone="green" icon="checkmark" />;
      case 'outgoing':
        return <Pill text="Envoyée" tone="grey" icon="time-outline" />;
      case 'incoming':
        return <SmallButton title="Accepter" icon="checkmark" onPress={() => act(u.id, true)} />;
      default:
        return <SmallButton title="Ajouter" icon="person-add" onPress={() => act(u.id, true)} />;
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.screen, { gap: 10 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.orange2}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={st.search}>
        <Ionicons name="search" size={18} color={colors.dim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ajouter un ami : tape son pseudo"
          placeholderTextColor={colors.dim}
          style={st.input}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Chercher un joueur"
        />
        {searching ? <ActivityIndicator color={colors.orange2} /> : q ? (
          <Pressable onPress={() => setQ('')} accessibilityLabel="Effacer la recherche">
            <Ionicons name="close-circle" size={18} color={colors.dim} />
          </Pressable>
        ) : null}
      </View>
      <ErrorText>{error}</ErrorText>

      {found ? (
        <>
          <Kicker>Résultats</Kicker>
          {found.length ? (
            found.map((u) => <FriendRow key={u.id} u={u} sub={u.city ?? undefined} right={searchAction(u)} />)
          ) : (
            <Text style={s.sub}>Aucun joueur ne s'appelle comme ça.</Text>
          )}
        </>
      ) : (
        <>
          {data.incoming.length ? <Kicker>{`Demandes reçues · ${data.incoming.length}`}</Kicker> : null}
          {data.incoming.map((u) => (
            <FriendRow
              key={u.id}
              u={u}
              sub={timeAgo(u.requested_at)}
              right={
                <View style={[s.row, { gap: 6 }]}>
                  <SmallButton title="Accepter" onPress={() => act(u.id, true)} />
                  <IconButton icon="close" label={`Refuser ${u.display_name}`} onPress={() => act(u.id, false)} />
                </View>
              }
            />
          ))}

          {!data.friends.length ? (
            <Empty
              icon="people-outline"
              title="Pas encore d'amis"
              text="Cherche tes potes par leur pseudo, ou ajoute-les depuis leur profil après un match. Tu verras quand ils jouent."
            />
          ) : (
            groups.map(([title, list]) =>
              list.length ? (
                <View key={title} style={{ gap: 10 }}>
                  <Kicker>{title}</Kicker>
                  {list.map((f) => (
                    <FriendRow key={f.id} u={f} presence={f.presence}
                      right={f.presence?.match ? <IconButton icon="football-outline" label="Voir son match" onPress={() => router.push(`/match/${f.presence!.match!.id}`)} /> : undefined} />
                  ))}
                </View>
              ) : null
            )
          )}

          {data.outgoing.length ? <Kicker>{`Demandes envoyées · ${data.outgoing.length}`}</Kicker> : null}
          {data.outgoing.map((u) => (
            <FriendRow key={u.id} u={u} sub={`En attente · ${timeAgo(u.requested_at)}`} right={<SmallButton title="Annuler" ghost onPress={() => act(u.id, false)} />} />
          ))}
          <Button title={copied ? 'Lien copié, colle-le à ton pote' : 'Inviter un pote'} icon={copied ? 'checkmark' : 'share-outline'} variant="ghost" onPress={share} />
          {data.friends.length ? (
            <Text style={[s.sub, { textAlign: 'center', fontSize: 12.5 }]}>
              Tes amis voient aussi ton statut. Tu peux le cacher dans les Réglages.
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14 },
  input: { flex: 1, ...font.medium, fontSize: 15, color: colors.ink, paddingVertical: 13 },
  small: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.orange2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  smallGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line },
  smallText: { ...font.bold, fontSize: 13, color: colors.chalk },
});
