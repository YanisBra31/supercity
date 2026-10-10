// Publication du fil : auteur, texte, photo, match lié, j'aime et commentaires.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { del, Post, post } from '../lib/api';
import { timeAgo, whenLabel } from '../lib/format';
import { Gradient } from './brand';
import { Avatar, Card, colors, font, s, TeamCrest } from './ui';
import { RoleBadge } from './Grade';

function ask(title: string, actions: { text: string; destructive?: boolean; onPress: () => void }[]) {
  if (Platform.OS === 'web') {
    const a = actions[0];
    if (globalThis.confirm?.(`${a.text} ?`)) a.onPress();
    return;
  }
  Alert.alert(title, undefined, [...actions.map((a) => ({ text: a.text, style: a.destructive ? ('destructive' as const) : undefined, onPress: a.onPress })), { text: 'Annuler', style: 'cancel' }]);
}

export function PostCard({ p, index, onChange, onRemove, detail }: { p: Post; index?: number; onChange: (p: Post) => void; onRemove: (id: number) => void; detail?: boolean }) {
  const pop = useRef(new Animated.Value(1)).current;
  const [busy, setBusy] = useState(false);

  const like = async () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.35, useNativeDriver: false, speed: 40 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: false, speed: 20 }),
    ]).start();
    // Affichage immédiat, corrigé par la réponse du serveur.
    onChange({ ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) });
    try {
      onChange(p.liked ? await del<Post>(`/posts/${p.id}/like`) : await post<Post>(`/posts/${p.id}/like`));
    } catch {
      onChange(p);
    } finally {
      setBusy(false);
    }
  };

  const remove = { text: p.is_mine ? 'Supprimer la publication' : 'Supprimer (modération)', destructive: true, onPress: async () => { await del(`/posts/${p.id}`); onRemove(p.id); } };
  const report = { text: 'Signaler la publication', destructive: true, onPress: async () => { await post(`/posts/${p.id}/report`, {}); onRemove(p.id); } };
  // Un modérateur peut supprimer la publication d'un autre directement, ou la signaler comme tout le monde.
  const more = () =>
    p.is_mine ? ask('Ta publication', [remove]) : ask('Cette publication', p.can_delete ? [remove, report] : [report]);

  return (
    <Card index={index} style={{ gap: 10, padding: 0, overflow: 'hidden' }}>
      <View style={[s.row, { padding: 14, paddingBottom: 0, gap: 10 }]}>
        <Pressable onPress={() => router.push(`/user/${p.author.id}`)}>
          <Avatar name={p.author.display_name} uri={p.author.avatar_url} tone={p.author.accent} size={42} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={[s.row, { gap: 6 }]}>
            <Text style={st.author} onPress={() => router.push(`/user/${p.author.id}`)}>
              {p.author.display_name}
            </Text>
            <RoleBadge role={p.author.site_role} />
          </View>
          <Text style={st.meta}>
            {timeAgo(p.created_at)}
            {p.team ? ` · ${p.team.name}` : ''}
          </Text>
        </View>
        {p.team ? (
          <Pressable onPress={() => router.push(`/team/${p.team!.id}`)}>
            <TeamCrest name={p.team.name} logo={p.team.logo_url} primary={p.team.color_primary} secondary={p.team.color_secondary} size={30} />
          </Pressable>
        ) : null}
        <Pressable onPress={more} hitSlop={10} accessibilityLabel="Plus d'options">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.dim} />
        </Pressable>
      </View>

      {p.body ? <Text style={[st.body, p.kind === 'challenge' && st.challenge]}>{p.body}</Text> : null}
      {p.image_url ? <Image source={{ uri: p.image_url }} style={st.image} resizeMode="cover" /> : null}

      {p.match ? (
        <Pressable onPress={() => router.push(`/match/${p.match!.id}`)} style={{ marginHorizontal: 14 }}>
          <Gradient tone="night" style={st.match}>
            {p.match.home_team ? (
              <TeamCrest name={p.match.home_team.name} logo={p.match.home_team.logo_url} primary={p.match.home_team.color_primary} secondary={p.match.home_team.color_secondary} size={34} />
            ) : null}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={st.matchVs}>
                {p.match.home_team?.name ?? 'Match'} <Text style={{ color: colors.orange1 }}>vs</Text> {p.match.away_team?.name ?? '?'}
              </Text>
              <Text style={st.matchWhen}>
                {whenLabel(p.match.starts_at)} · {p.match.venue.name}
              </Text>
            </View>
            {p.match.away_team ? (
              <TeamCrest name={p.match.away_team.name} logo={p.match.away_team.logo_url} primary={p.match.away_team.color_primary} secondary={p.match.away_team.color_secondary} size={34} />
            ) : null}
          </Gradient>
        </Pressable>
      ) : null}

      <View style={[s.row, { paddingHorizontal: 14, paddingBottom: 12, gap: 20 }]}>
        <Pressable onPress={like} style={s.row} accessibilityRole="button" accessibilityLabel={p.liked ? "Je n'aime plus" : "J'aime"} hitSlop={8}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Ionicons name={p.liked ? 'heart' : 'heart-outline'} size={22} color={p.liked ? colors.orange2 : colors.ink} />
          </Animated.View>
          <Text style={st.count}>{p.likes_count}</Text>
        </Pressable>
        <Pressable onPress={() => !detail && router.push(`/post/${p.id}`)} style={s.row} accessibilityRole="button" accessibilityLabel="Commentaires" hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.ink} />
          <Text style={st.count}>{p.comments_count}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  author: { ...font.bold, fontSize: 15, color: colors.ink },
  meta: { ...font.regular, fontSize: 12, color: colors.dim },
  body: { ...font.regular, fontSize: 15, lineHeight: 22, color: colors.ink, paddingHorizontal: 14 },
  challenge: { ...font.bold },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.tint },
  match: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchVs: { ...font.extrabold, fontSize: 14, color: colors.chalk, textAlign: 'center' },
  matchWhen: { ...font.regular, fontSize: 12, color: colors.chalk, opacity: 0.8, textAlign: 'center' },
  count: { ...font.semibold, fontSize: 14, color: colors.ink },
});
