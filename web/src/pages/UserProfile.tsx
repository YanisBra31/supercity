// Profil public d'un joueur.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError, get, Post, PublicProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Page } from '../ui/Layout';
import { ProfileView } from '../ui/profile/ProfileView';
import { FriendButton, PresenceDot, PresenceText } from '../ui/social';
import { ErrorText, Loading } from '../ui/ui';

export default function UserProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setP(null);
    setError('');
    get<PublicProfile>(`/users/${id}`)
      .then(setP)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Profil introuvable.'));
    get<{ items: Post[] }>('/feed', { author_id: id, limit: 10 })
      .then((r) => setPosts(r.items))
      .catch(() => setPosts([]));
  }, [id]);

  return (
    <Page title={p?.display_name ?? 'Joueur'} back="/friends">
      {!p ? (
        error ? <ErrorText>{error}</ErrorText> : <Loading />
      ) : (
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
            <div className="card row" style={{ gap: 12 }}>
              <PresenceDot p={p.presence} size={14} />
              <PresenceText p={p.presence} />
            </div>
          ) : null}
        </ProfileView>
      )}
    </Page>
  );
}
