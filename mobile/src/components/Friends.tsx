// Amis : bouton d'ajout sur un profil, pastille de statut et ligne d'ami (photo, pseudo, en match / en ligne / vu il y a...).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FramedAvatar } from './Cosmetics';
import { Button, colors, ErrorText, font, s } from './ui';
import { ApiError, del, Friendship, post, Presence, PublicUser } from '../lib/api';
import { refreshBadge } from '../lib/badge';
import { nextMatchLabel, PRESENCE_COLORS, presenceLabel } from '../lib/presence';

/** Demande de confirmation, aussi sur le web (Alert n'y affiche qu'un message). */
export function confirmAction(title: string, text: string, ok: string, run: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${text}`) ?? true) run();
    return;
  }
  Alert.alert(title, text, [
    { text: 'Annuler', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: run },
  ]);
}

export async function sendFriend(id: number, add: boolean): Promise<Friendship> {
  const r = add ? await post<{ friendship: Friendship }>(`/users/${id}/friend`) : await del<{ friendship: Friendship }>(`/users/${id}/friend`);
  refreshBadge();
  return r.friendship;
}

/** Pastille de couleur : orange en match, vert en ligne, gris sinon. */
export function PresenceDot({ p, size = 12, border = colors.white }: { p: Presence | null | undefined; size?: number; border?: string }) {
  if (!p) return null;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PRESENCE_COLORS[p.state], borderWidth: 2, borderColor: border }} />;
}

/** Statut en toutes lettres, avec le prochain match en dessous. */
export function PresenceText({ p, lines = 1 }: { p: Presence; lines?: number }) {
  const next = p.state !== 'match' ? nextMatchLabel(p) : null;
  return (
    <View style={{ gap: 1, flexShrink: 1 }}>
      <View style={[s.row, { gap: 6 }]}>
        {p.state === 'match' ? <Ionicons name="football" size={13} color={PRESENCE_COLORS.match} /> : null}
        <Text style={[st.status, { color: p.state === 'offline' ? colors.dim : PRESENCE_COLORS[p.state] }]} numberOfLines={lines}>
          {presenceLabel(p)}
        </Text>
      </View>
      {next ? (
        <Text style={st.next} numberOfLines={lines}>
          {next}
        </Text>
      ) : null}
    </View>
  );
}

/** Ligne d'un joueur dans les listes d'amis, de demandes ou de recherche. */
export function FriendRow({ u, presence, sub, right }: { u: PublicUser; presence?: Presence | null; sub?: string; right?: ReactNode }) {
  return (
    <Pressable
      onPress={() => router.push(`/user/${u.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${u.display_name}${presence ? `, ${presenceLabel(presence)}` : ''}`}
      style={({ pressed }) => [st.row, pressed && { opacity: 0.85 }]}
    >
      <View>
        <FramedAvatar frame={u.cosmetics?.frame} name={u.display_name} uri={u.avatar_url} size={48} />
        <View style={st.dot}>
          <PresenceDot p={presence} size={14} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={st.name} numberOfLines={1}>
          {u.display_name}
        </Text>
        {presence ? <PresenceText p={presence} /> : sub ? <Text style={st.next}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** Bouton d'amitié sur le profil d'un autre joueur, selon où vous en êtes. */
export function FriendButton({ userId, name, state, onChange }: { userId: number; name: string; state: Friendship; onChange: (f: Friendship) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (add: boolean) => {
    setBusy(true);
    setError('');
    try {
      onChange(await sendFriend(userId, add));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      {state === 'none' ? <Button title="Ajouter en ami" icon="person-add" onPress={() => run(true)} loading={busy} /> : null}
      {state === 'outgoing' ? (
        <Button title="Demande envoyée" icon="time-outline" variant="ghost" loading={busy}
          onPress={() => confirmAction('Annuler ta demande ?', `${name} ne verra plus ta demande d'ami.`, 'Annuler la demande', () => run(false))} />
      ) : null}
      {state === 'incoming' ? (
        <View style={[s.row, { gap: 10 }]}>
          <Button title="Accepter" icon="checkmark" onPress={() => run(true)} loading={busy} style={{ flex: 1 }} />
          <Button title="Refuser" variant="ghost" onPress={() => run(false)} disabled={busy} style={{ flex: 1 }} />
        </View>
      ) : null}
      {state === 'friends' ? (
        <Button title="Vous êtes amis" icon="people" variant="dark" loading={busy}
          onPress={() => confirmAction(`Retirer ${name} de tes amis ?`, 'Vous ne verrez plus le statut l\'un de l\'autre.', 'Retirer', () => run(false))} />
      ) : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12 },
  dot: { position: 'absolute', right: 0, bottom: 0 },
  name: { ...font.bold, fontSize: 15, color: colors.ink },
  status: { ...font.semibold, fontSize: 13, flexShrink: 1 },
  next: { ...font.regular, fontSize: 12.5, color: colors.dim },
});
