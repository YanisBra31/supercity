// Profil public d'un joueur.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ErrorText, Loading, Screen } from '../../components/ui';
import { ProfileView } from '../../components/ProfileView';
import { ApiError, get, Post, PublicProfile } from '../../lib/api';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    get<{ items: Post[] }>('/feed', { author_id: id, limit: 10 }).then((r) => setPosts(r.items)).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    get<PublicProfile>(`/users/${id}`)
      .then(setP)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Profil introuvable.'));
  }, [id]);

  if (!p) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: p.display_name }} />
      <ProfileView p={p} posts={posts} setPosts={setPosts} />
    </Screen>
  );
}
