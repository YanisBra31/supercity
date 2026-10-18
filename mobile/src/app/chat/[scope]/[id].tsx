// Discussion d'un match ou d'une équipe. Les nouveaux messages arrivent toutes les 5 secondes tant que l'écran est ouvert.
// Un appui long sur un de ses messages permet de l'effacer.
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmAction } from '../../../components/Friends';
import { Avatar, colors, Empty, ErrorText, font, Loading } from '../../../components/ui';
import { ApiError, Chat, ChatMessage, ChatScope, del, get, post } from '../../../lib/api';
import { dayLabel, timeLabel } from '../../../lib/format';

const POLL_MS = 5000;

export default function ChatScreen() {
  const { scope, id } = useLocalSearchParams<{ scope: ChatScope; id: string }>();
  const insets = useSafeAreaInsets();
  const [chat, setChat] = useState<Chat | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const lastId = useRef(0);
  const base = `/chats/${scope}/${id}/messages`;

  const merge = (items: ChatMessage[]) => {
    if (!items.length) return;
    lastId.current = Math.max(lastId.current, ...items.map((m) => m.id));
    setChat((c) => (c ? { ...c, items: [...c.items, ...items.filter((m) => !c.items.some((x) => x.id === m.id))] } : c));
  };

  useEffect(() => {
    lastId.current = 0;
    get<Chat>(base)
      .then((c) => {
        lastId.current = c.items.length ? c.items[c.items.length - 1].id : 0;
        setChat(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Discussion indisponible.'));
  }, [base]);

  // Nouveaux messages, tant que l'écran est affiché.
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => {
        get<Chat>(base, { after: lastId.current }).then((c) => merge(c.items)).catch(() => undefined);
      }, POLL_MS);
      return () => clearInterval(t);
    }, [base])
  );

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const m = await post<ChatMessage>(base, { body });
      setText('');
      merge([m]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Message non envoyé.');
    } finally {
      setSending(false);
    }
  };

  const remove = (m: ChatMessage) =>
    confirmAction('Effacer ce message ?', 'Il disparaîtra pour tout le monde.', 'Effacer', async () => {
      try {
        await del(`/chats/messages/${m.id}`);
        setChat((c) => (c ? { ...c, items: c.items.filter((x) => x.id !== m.id) } : c));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Message non effacé.');
      }
    });

  if (!chat) return error ? <View style={st.center}><ErrorText>{error}</ErrorText></View> : <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen options={{ title: chat.title }} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={st.list}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {!chat.items.length ? (
          <Empty
            icon="chatbubbles-outline"
            title="Lance la discussion"
            text={`${chat.members_count} ${scope === 'team' ? 'membre' : 'joueur'}${chat.members_count > 1 ? 's' : ''} ${scope === 'team' ? 'de l\'équipe' : 'du match'} ${chat.members_count > 1 ? 'verront' : 'verra'} tes messages.`}
          />
        ) : null}
        {chat.items.map((m, i) => {
          const prev = chat.items[i - 1];
          const d = new Date(m.created_at);
          const newDay = !prev || new Date(prev.created_at).toDateString() !== d.toDateString();
          const sameAuthor = prev && !newDay && prev.author.id === m.author.id;
          return (
            <View key={m.id}>
              {newDay ? <Text style={st.day}>{dayLabel(d)}</Text> : null}
              <View style={[st.line, m.mine && { justifyContent: 'flex-end' }, sameAuthor && { marginTop: -6 }]}>
                {!m.mine ? (
                  <View style={{ width: 32 }}>{!sameAuthor ? <Avatar name={m.author.display_name} uri={m.author.avatar_url} tone={m.author.accent} size={32} /> : null}</View>
                ) : null}
                <Pressable
                  onLongPress={m.mine ? () => remove(m) : undefined}
                  accessibilityHint={m.mine ? 'Appui long pour effacer' : undefined}
                  style={[st.bubble, m.mine ? st.mine : st.theirs]}
                >
                  {!m.mine && !sameAuthor ? <Text style={st.author}>{m.author.display_name}</Text> : null}
                  <Text style={[st.body, m.mine && { color: colors.chalk }]}>{m.body}</Text>
                  <Text style={[st.time, m.mine && { color: 'rgba(255,248,241,.75)' }]}>{timeLabel(d)}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <ErrorText>{error}</ErrorText>
      <View style={[st.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écris un message…"
          placeholderTextColor={colors.dim}
          style={st.input}
          multiline
          maxLength={500}
          accessibilityLabel="Message"
          onSubmitEditing={send}
          blurOnSubmit={false}
          onKeyPress={(e) => {
            // Sur ordinateur : Entrée envoie, Maj + Entrée passe à la ligne.
            const k = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && k.key === 'Enter' && !k.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          style={[st.send, (!text.trim() || sending) && { opacity: 0.45 }]}
        >
          <Ionicons name="send" size={18} color={colors.chalk} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, padding: 20, backgroundColor: colors.bg },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  day: { ...font.semibold, fontSize: 12, color: colors.dim, textAlign: 'center', marginVertical: 6 },
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  mine: { backgroundColor: colors.orange2, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  author: { ...font.bold, fontSize: 12.5, color: colors.orange2 },
  body: { ...font.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  time: { ...font.medium, fontSize: 10.5, color: colors.dim, alignSelf: 'flex-end' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  input: { flex: 1, ...font.regular, fontSize: 15, color: colors.ink, backgroundColor: colors.white, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, maxHeight: 120 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange2 },
});
