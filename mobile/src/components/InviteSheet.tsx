// Inviter des amis à un match : on coche, on envoie. Chaque ami ne reçoit qu'une invitation par match.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FramedAvatar } from './Cosmetics';
import { PresenceDot } from './Friends';
import { Button, colors, ErrorText, font, s } from './ui';
import { ApiError, get, Invitable, post } from '../lib/api';
import { presenceLabel } from '../lib/presence';
import { sheetWidth } from './WebFrame';

const STATE_LABEL = { in: 'Déjà dans le match', invited: 'Déjà invité' } as const;

export function InviteSheet({ matchId, visible, onClose, onSent }: { matchId: number; visible: boolean; onClose: () => void; onSent: (n: number) => void }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Invitable[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setItems(null);
    setPicked(new Set());
    setError('');
    get<{ items: Invitable[] }>(`/matches/${matchId}/invitable`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Liste d\'amis indisponible.'));
  }, [visible, matchId]);

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await post<{ invited: number }>(`/matches/${matchId}/invite`, { user_ids: [...picked] });
      onSent(r.invited);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invitation impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const available = items?.filter((i) => i.invite === 'available') ?? [];
  const allPicked = available.length > 0 && available.every((i) => picked.has(i.id));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[st.sheet, sheetWidth, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.grabber} />
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={st.title}>Inviter des amis</Text>
          {available.length > 1 ? (
            <Pressable onPress={() => setPicked(allPicked ? new Set() : new Set(available.map((i) => i.id)))} accessibilityRole="button">
              <Text style={st.all}>{allPicked ? 'Aucun' : 'Tous'}</Text>
            </Pressable>
          ) : null}
        </View>
        {!items ? (
          error ? null : <ActivityIndicator color={colors.orange2} style={{ marginVertical: 24 }} />
        ) : !items.length ? (
          <View style={{ gap: 10, paddingVertical: 8 }}>
            <Text style={s.sub}>Ajoute d'abord des amis pour pouvoir les inviter.</Text>
            <Button title="Trouver des amis" icon="person-add-outline" variant="dark" onPress={() => { onClose(); router.push('/friends'); }} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 8 }} style={{ maxHeight: 380 }}>
            {items.map((u) => {
              const on = picked.has(u.id);
              const free = u.invite === 'available';
              return (
                <Pressable
                  key={u.id}
                  onPress={() => free && toggle(u.id)}
                  disabled={!free}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: !free }}
                  style={[st.row, on && st.rowOn, !free && { opacity: 0.55 }]}
                >
                  <View>
                    <FramedAvatar frame={u.cosmetics?.frame} name={u.display_name} uri={u.avatar_url} size={40} />
                    <View style={{ position: 'absolute', right: 0, bottom: 0 }}>
                      <PresenceDot p={u.presence} size={12} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.name} numberOfLines={1}>{u.display_name}</Text>
                    <Text style={st.sub} numberOfLines={1}>
                      {free ? (u.presence ? presenceLabel(u.presence) : u.city ?? ' ') : STATE_LABEL[u.invite as 'in' | 'invited']}
                    </Text>
                  </View>
                  {free ? <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.orange2 : colors.line} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <ErrorText>{error}</ErrorText>
        {items?.length ? (
          <Button
            title={picked.size ? `Inviter ${picked.size} ami${picked.size > 1 ? 's' : ''}` : 'Choisis tes amis'}
            icon="paper-plane-outline"
            disabled={!picked.size}
            loading={busy}
            onPress={send}
          />
        ) : null}
        <Button title="Fermer" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,23,.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 12, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  title: { ...font.extrabold, fontSize: 22, color: colors.ink },
  all: { ...font.semibold, fontSize: 14, color: colors.orange2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 10 },
  rowOn: { borderColor: colors.orange2, backgroundColor: colors.tint },
  name: { ...font.bold, fontSize: 15, color: colors.ink },
  sub: { ...font.regular, fontSize: 12.5, color: colors.dim },
});
