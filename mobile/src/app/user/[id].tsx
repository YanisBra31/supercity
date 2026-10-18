// Profil public d'un joueur.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Card, ErrorText, Loading, Screen } from '../../components/ui';
import { FriendButton, PresenceDot, PresenceText } from '../../components/Friends';
import { ProfileView } from '../../components/ProfileView';
import { useAuth } from '../../lib/auth';
import { ApiError, get, Post, PublicProfile } from '../../lib/api';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
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
      <ProfileView
        p={p}
        posts={posts}
        setPosts={setPosts}
        actions={
          p.id !== user?.id && p.friendship ? (
            <FriendButton
              userId={p.id}
              name={p.display_name}
              state={p.friendship}
              onChange={(friendship) => {
                setP({ ...p, friendship });
                // Devenus amis : on recharge pour afficher son statut.
                if (friendship === 'friends') get<PublicProfile>(`/users/${id}`).then(setP).catch(() => undefined);
              }}
            />
          ) : null
        }
      >
        {p.presence ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PresenceDot p={p.presence} size={14} />
            <PresenceText p={p.presence} lines={2} />
          </Card>
        ) : null}
      </ProfileView>
    </Screen>
  );
}
