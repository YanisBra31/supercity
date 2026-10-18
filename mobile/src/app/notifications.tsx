// Centre de notifications : tout ce qui concerne le joueur, du plus récent au plus ancien.
// Ouvrir l'écran marque tout comme lu ; les nouveautés restent surlignées le temps de la visite.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/brand';
import { Avatar, colors, Empty, ErrorText, font, Kicker, Loading, s } from '../components/ui';
import { ApiError, Badge, get, InboxItem, post } from '../lib/api';
import { setBadge } from '../lib/badge';
import { timeAgo } from '../lib/format';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, IconName> = {
  score: 'clipboard-outline',
  challenge: 'flash-outline',
  challenge_accepted: 'checkmark-circle-outline',
  challenge_declined: 'close-circle-outline',
  waitlist: 'arrow-up-circle-outline',
  cancelled: 'calendar-clear-outline',
  streak: 'flame-outline',
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
  friend_match: 'football-outline',
  invite: 'mail-open-outline',
  reminder: 'alarm-outline',
};

function Row({ n, index }: { n: InboxItem; index: number }) {
  const open = () => {
    if (n.url) router.push(n.url as never);
  };
  return (
    <FadeIn index={Math.min(index, 8)}>
      <Pressable
        onPress={open}
        disabled={!n.url}
        accessibilityRole={n.url ? 'button' : 'text'}
        accessibilityLabel={`${n.read ? '' : 'Nouveau. '}${n.title}. ${n.body}`}
        style={({ pressed }) => [st.row, !n.read && st.unread, pressed && { opacity: 0.8 }]}
      >
        {n.actor ? (
          <View>
            <Avatar name={n.actor.display_name} uri={n.actor.avatar_url} size={44} />
            <View style={st.kindDot}>
              <Ionicons name={ICONS[n.kind] ?? 'notifications-outline'} size={12} color={colors.chalk} />
            </View>
          </View>
        ) : (
          <View style={st.icon}>
            <Ionicons name={ICONS[n.kind] ?? 'notifications-outline'} size={22} color={colors.orange2} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={[s.row, { justifyContent: 'space-between', gap: 8 }]}>
            <Text style={st.title} numberOfLines={1}>
              {n.title}
            </Text>
            <Text style={st.time}>{timeAgo(n.created_at)}</Text>
          </View>
          <Text style={st.body}>{n.body}</Text>
        </View>
        {!n.read ? <View style={st.newDot} /> : null}
      </Pressable>
    </FadeIn>
  );
}

export default function Notifications() {
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await get<{ items: InboxItem[] } & Badge>('/me/inbox');
      setItems(r.items);
      if (r.unread) setBadge(await post<Badge>('/me/inbox/read'));
      else setBadge(r);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Notifications indisponibles.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!items) return error ? <View style={[s.screen]}><ErrorText>{error}</ErrorText></View> : <Loading />;

  const fresh = items.filter((n) => !n.read);
  const older = items.filter((n) => n.read);
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.screen, { gap: 10 }]}
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
      <ErrorText>{error}</ErrorText>
      {!items.length ? (
        <Empty
          icon="notifications-outline"
          title="Rien de neuf pour l'instant"
          text="Invitations, rappels, scores à confirmer, défis, demandes d'ami : tout arrivera ici."
          action={{ title: 'Trouver des amis', icon: 'person-add-outline', onPress: () => router.push('/friends') }}
        />
      ) : null}
      {fresh.length ? <Kicker>Nouveau</Kicker> : null}
      {fresh.map((n, i) => (
        <Row key={n.id} n={n} index={i} />
      ))}
      {older.length && fresh.length ? <Kicker>Plus tôt</Kicker> : null}
      {older.map((n, i) => (
        <Row key={n.id} n={n} index={fresh.length + i} />
      ))}
      {items.length ? <Text style={[s.sub, { textAlign: 'center', fontSize: 12.5 }]}>Les notifications sont gardées 90 jours.</Text> : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12 },
  unread: { backgroundColor: colors.tint, borderColor: colors.orange1 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  kindDot: { position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange2, borderWidth: 2, borderColor: colors.white },
  title: { ...font.bold, fontSize: 14.5, color: colors.ink, flexShrink: 1 },
  time: { ...font.medium, fontSize: 12, color: colors.dim },
  body: { ...font.regular, fontSize: 13.5, lineHeight: 19, color: colors.dim },
  newDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.orange2 },
});
