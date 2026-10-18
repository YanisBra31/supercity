// Fil d'actualité : publications de tous les joueurs ou de mes équipes.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BouncingBall } from '../../components/brand';
import { PostCard } from '../../components/PostCard';
import { Avatar, Chips, colors, Empty, ErrorText, font, PageHeader, s } from '../../components/ui';
import { ApiError, get, Post } from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Scope = 'all' | 'teams';

export default function Feed() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('all');
  const [items, setItems] = useState<Post[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(true);
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await get<{ items: Post[] }>('/feed', { scope, limit: 20 });
      setItems(r.items);
      setMore(r.items.length === 20);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger le fil.');
      setItems((prev) => prev ?? []);
    }
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadMore = async () => {
    if (!items?.length || !more || loadingMore.current) return;
    loadingMore.current = true;
    const r = await get<{ items: Post[] }>('/feed', { scope, limit: 20, before_id: items[items.length - 1].id }).catch(() => ({ items: [] as Post[] }));
    setItems((prev) => [...(prev ?? []), ...r.items]);
    setMore(r.items.length === 20);
    loadingMore.current = false;
  };

  const update = (p: Post) => setItems((prev) => prev?.map((x) => (x.id === p.id ? p : x)) ?? null);
  const remove = (id: number) => setItems((prev) => prev?.filter((x) => x.id !== id) ?? null);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }}
      data={items ?? []}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item, index }) => <PostCard p={item} index={index} onChange={update} onRemove={remove} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.orange2} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <PageHeader kicker="Dans les vestiaires" title="Le fil" sub="Résultats, photos, annonces des terrains." />
          <Pressable onPress={() => router.push('/post/new')} accessibilityRole="button" style={({ pressed }) => [s.row, { backgroundColor: colors.white, borderRadius: 20, padding: 12, gap: 12, borderWidth: 1, borderColor: colors.line }, pressed && { borderColor: colors.orange1 }]}>
            <Avatar name={user?.display_name ?? ''} uri={user?.avatar_url} tone={user?.accent} size={40} />
            <Text style={{ ...font.regular, flex: 1, color: colors.dim, fontSize: 15 }}>Quoi de neuf sur le terrain ?</Text>
            <Ionicons name="image-outline" size={22} color={colors.orange2} />
          </Pressable>
          <Chips options={[{ value: 'all', label: 'Tout le monde' }, { value: 'teams', label: 'Mes équipes' }]} value={scope} onChange={(v) => v && setScope(v as Scope)} />
          <ErrorText>{error}</ErrorText>
        </View>
      }
      ListEmptyComponent={
        items === null ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <BouncingBall size={26} />
          </View>
        ) : (
          <Empty
            icon="newspaper-outline"
            title="Rien pour l'instant"
            text={scope === 'teams' ? 'Tes coéquipiers n’ont encore rien publié. Lance le mouvement !' : 'Sois le premier à publier.'}
            action={{ title: 'Publier', icon: 'create-outline', onPress: () => router.push('/post/new') }}
          />
        )
      }
      ListFooterComponent={items?.length && more ? <View style={{ alignItems: 'center', paddingVertical: 16 }}><BouncingBall size={18} /></View> : null}
    />
  );
}
