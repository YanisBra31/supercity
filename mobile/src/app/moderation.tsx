// Modération : publications signalées (garder, supprimer, suspendre l'auteur) et gestion des joueurs.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GradeBadge, RoleBadge } from '../components/Grade';
import { Avatar, Button, Card, Chips, colors, Empty, ErrorText, font, Kicker, Loading, s, Screen, Success } from '../components/ui';
import { ApiError, del, get, ModReport, ModUser, post, Role } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';

const DURATIONS = [
  { value: 1, label: '1 jour' },
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
];

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function Moderation() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'reports' | 'users'>('reports');
  const [reports, setReports] = useState<ModReport[] | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<ModUser[]>([]);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const admin = user?.site_role === 'admin';

  const loadReports = useCallback(async () => {
    try {
      setReports((await get<{ items: ModReport[] }>('/mod/reports')).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
      setReports([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  // Lance une action, affiche le résultat, puis recharge.
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setError('');
    setMsg('');
    try {
      await fn();
      setMsg(done);
      await loadReports();
      if (q.trim().length >= 2) search(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    }
  };

  const search = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) return setFound([]);
    try {
      setFound((await get<{ items: ModUser[] }>('/mod/users', { q: text.trim() })).items);
    } catch {
      setFound([]);
    }
  };

  if (!user || (user.site_role !== 'moderator' && !admin)) {
    return (
      <Screen>
        <Empty icon="lock-closed-outline" title="Réservé à la modération" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Chips
        options={[
          { value: 'reports', label: `Signalements${reports?.length ? ` (${reports.length})` : ''}` },
          { value: 'users', label: 'Joueurs' },
        ]}
        value={tab}
        onChange={(v) => v && setTab(v as typeof tab)}
      />
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>

      {tab === 'reports' ? (
        reports === null ? (
          <Loading />
        ) : reports.length === 0 ? (
          <Empty icon="checkmark-done-outline" title="Rien à modérer" text="Aucune publication signalée pour le moment." />
        ) : (
          reports.map((r, i) => (
            <Card key={r.post.id} index={i} style={{ gap: 10 }}>
              <View style={[s.row, { gap: 10 }]}>
                <Avatar name={r.post.author.display_name} uri={r.post.author.avatar_url} tone={r.post.author.accent} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={st.name} onPress={() => router.push(`/user/${r.post.author.id}`)}>
                    {r.post.author.display_name}
                  </Text>
                  <Text style={st.meta}>{timeAgo(r.post.created_at)}</Text>
                </View>
                <View style={[st.count, r.hidden && { backgroundColor: colors.danger }]}>
                  <Ionicons name="flag" size={12} color="#fff" />
                  <Text style={st.countText}>{r.reports}</Text>
                </View>
              </View>
              {r.post.body ? <Text style={st.body}>{r.post.body}</Text> : null}
              {r.post.image_url ? <Image source={{ uri: r.post.image_url }} style={st.image} resizeMode="cover" /> : null}
              <Text style={st.meta}>
                {r.hidden ? 'Masquée pour tous. ' : ''}
                {r.reasons.length ? `Motifs : ${r.reasons.join(', ')}` : 'Aucun motif donné.'}
              </Text>
              <View style={[s.row, { flexWrap: 'wrap' }]}>
                <Button title="Garder" variant="ghost" icon="checkmark" onPress={() => act(() => post(`/mod/posts/${r.post.id}/keep`), 'Publication gardée, signalements effacés.')} />
                <Button
                  title="Supprimer"
                  variant="danger"
                  icon="trash-outline"
                  onPress={async () => (await confirm('Supprimer la publication ?', 'Elle disparaîtra pour tout le monde.')) && act(() => del(`/posts/${r.post.id}`), 'Publication supprimée.')}
                />
                <Button
                  title={`Suspendre ${days} j`}
                  variant="dark"
                  icon="ban-outline"
                  onPress={async () =>
                    (await confirm(`Suspendre ${r.post.author.display_name} ?`, `Pendant ${days} jour${days > 1 ? 's' : ''}, il ne pourra plus publier, commenter ni organiser.`)) &&
                    act(() => post(`/mod/users/${r.post.author.id}/suspend`, { days, reason: r.reasons[0] ?? 'Publication signalée' }), `${r.post.author.display_name} est suspendu ${days} jour${days > 1 ? 's' : ''}.`)
                  }
                />
              </View>
            </Card>
          ))
        )
      ) : (
        <>
          <View style={s.input}>
            <Ionicons name="search" size={18} color={colors.dim} />
            <TextInput value={q} onChangeText={search} placeholder="Pseudo ou e-mail" placeholderTextColor="#a59a92" autoCapitalize="none" style={s.inputText} />
          </View>
          {found.map((u, i) => (
            <Card key={u.id} index={i} style={{ gap: 10 }}>
              <Pressable onPress={() => router.push(`/user/${u.id}`)} style={[s.row, { gap: 10 }]}>
                <Avatar name={u.display_name} uri={u.avatar_url} tone={u.accent} size={40} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={st.name}>{u.display_name}</Text>
                  <Text style={st.meta}>{u.email}</Text>
                  <View style={[s.row, { gap: 6 }]}>
                    <GradeBadge grade={u.grade} />
                    <RoleBadge role={u.site_role} />
                  </View>
                </View>
              </Pressable>
              {u.id !== user.id ? (
                <View style={[s.row, { flexWrap: 'wrap' }]}>
                  <Button title={`Suspendre ${days} j`} variant="dark" icon="ban-outline" onPress={() => act(() => post(`/mod/users/${u.id}/suspend`, { days }), `${u.display_name} est suspendu.`)} />
                  <Button title="Lever la suspension" variant="ghost" onPress={() => act(() => del(`/mod/users/${u.id}/suspend`), `Suspension levée pour ${u.display_name}.`)} />
                </View>
              ) : null}
              {admin && u.id !== user.id ? (
                <Chips
                  options={[
                    { value: 'user', label: 'Joueur' },
                    { value: 'moderator', label: 'Modérateur' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  value={u.site_role ?? 'user'}
                  onChange={(v) => v && v !== u.site_role && act(() => post(`/admin/users/${u.id}/role`, { role: v as Role }), `${u.display_name} est maintenant ${v === 'admin' ? 'admin' : v === 'moderator' ? 'modérateur' : 'joueur'}.`)}
                />
              ) : null}
            </Card>
          ))}
          {q.trim().length >= 2 && !found.length ? <Text style={s.sub}>Aucun joueur trouvé.</Text> : null}
        </>
      )}

      <Kicker>Durée des suspensions</Kicker>
      <Chips options={DURATIONS} value={days} onChange={(v) => v && setDays(v)} />
    </Screen>
  );
}

const st = StyleSheet.create({
  name: { ...font.bold, fontSize: 15, color: colors.ink },
  meta: { ...font.regular, fontSize: 12.5, color: colors.dim },
  body: { ...font.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  image: { width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.tint },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.orange2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  countText: { ...font.bold, fontSize: 12, color: '#fff' },
});
