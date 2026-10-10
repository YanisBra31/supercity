// Une publication et ses commentaires.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/PostCard';
import { Avatar, colors, ErrorText, font, Kicker, Loading, s } from '../../components/ui';
import { ApiError, Comment, del, get, Post, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { timeAgo } from '../../lib/format';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setP(await get<Post>(`/posts/${id}`));
      setComments((await get<{ items: Comment[] }>(`/posts/${id}/comments`)).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Publication introuvable.');
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const c = await post<Comment>(`/posts/${id}/comments`, { body: text.trim() });
      setComments((prev) => [...prev, c]);
      setP((prev) => (prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev));
      setText('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  const remove = async (c: Comment) => {
    await del(`/comments/${c.id}`).catch(() => undefined);
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    setP((prev) => (prev ? { ...prev, comments_count: prev.comments_count - 1 } : prev));
  };

  if (!p) return error ? <View style={{ padding: 20 }}><ErrorText>{error}</ErrorText></View> : <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <PostCard p={p} onChange={setP} onRemove={() => router.back()} detail />
        <Kicker>{comments.length ? `Commentaires (${comments.length})` : 'Aucun commentaire'}</Kicker>
        {comments.map((c) => (
          <View key={c.id} style={[s.row, { alignItems: 'flex-start', gap: 10 }]}>
            <Pressable onPress={() => router.push(`/user/${c.author.id}`)}>
              <Avatar name={c.author.display_name} uri={c.author.avatar_url} tone={c.author.accent} size={34} />
            </Pressable>
            <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: colors.line }}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={{ ...font.bold, fontSize: 13, color: colors.ink }}>{c.author.display_name}</Text>
                <Text style={{ ...font.regular, fontSize: 11, color: colors.dim }}>{timeAgo(c.created_at)}</Text>
              </View>
              <Text style={{ ...font.regular, fontSize: 14, lineHeight: 20, color: colors.ink }}>{c.body}</Text>
              {c.can_delete ? (
                <Text style={{ ...font.semibold, fontSize: 12, color: colors.dim, marginTop: 4 }} onPress={() => remove(c)}>
                  Supprimer
                </Text>
              ) : null}
            </View>
          </View>
        ))}
        <ErrorText>{error}</ErrorText>
      </ScrollView>
      <View style={[s.row, { padding: 10, paddingBottom: insets.bottom + 10, gap: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <Avatar name={user?.display_name ?? ''} uri={user?.avatar_url} tone={user?.accent} size={34} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écris un commentaire…"
          placeholderTextColor="#a59a92"
          maxLength={500}
          onSubmitEditing={send}
          style={{ ...font.regular, flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, backgroundColor: colors.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 }}
        />
        <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel="Envoyer" hitSlop={8}>
          <Ionicons name="send" size={22} color={text.trim() ? colors.orange2 : colors.line} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
