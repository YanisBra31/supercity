// Profil du joueur : son profil public tel que les autres le voient, avec ses boutons à soi (modifier, boutique, partager, réglages).
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, View } from 'react-native';
import { MatchCard } from '../../components/MatchCard';
import { ProfileView } from '../../components/ProfileView';
import { Banner, Button, ErrorText, IconButton, Kicker, Loading, s, Screen } from '../../components/ui';
import { get, Match, Post, PublicProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Profile() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allMatches, setAllMatches] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      get<{ items: Match[] }>('/me/matches').then((r) => setMatches(r.items)).catch(() => undefined);
      get<PublicProfile>(`/users/${user.id}`).then(setPub).catch(() => undefined);
      get<{ items: Post[] }>('/feed', { author_id: user.id, limit: 10 }).then((r) => setPosts(r.items)).catch(() => undefined);
    }, [user])
  );

  if (!user) return null;
  if (!pub) return <Loading />;

  const share = () => Share.share({ message: `${user.display_name} sur Supercity : supercity://user/${user.id}` });

  return (
    <Screen top>
      <ProfileView
        p={pub}
        posts={posts}
        setPosts={setPosts}
        onAvatarPress={() => router.push('/me/edit')}
        actions={
          <View style={s.row}>
            <Button title="Modifier" icon="pencil" variant="dark" onPress={() => router.push('/me/edit')} style={{ flex: 1 }} />
            <IconButton icon="bag-handle-outline" label="Boutique" onPress={() => router.push('/shop')} />
            <IconButton icon="share-outline" label="Partager mon profil" onPress={share} />
            <IconButton icon="settings-outline" label="Réglages" onPress={() => router.push('/settings')} />
          </View>
        }
      >
        {!user.email_verified ? (
          <Banner icon="mail-unread-outline" title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." onPress={() => router.push('/verify')} />
        ) : null}
        {user.suspended_until ? (
          <ErrorText>{`Ton compte est suspendu jusqu'au ${new Date(user.suspended_until).toLocaleDateString('fr-FR')}${user.suspended_reason ? ` (${user.suspended_reason})` : ''}. Tu peux consulter l'appli, mais pas publier ni organiser.`}</ErrorText>
        ) : null}
        {matches.length ? (
          <>
            <Kicker>{matches.length > 1 ? 'Mes prochains matchs' : 'Mon prochain match'}</Kicker>
            {(allMatches ? matches : matches.slice(0, 1)).map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
            {matches.length > 1 ? (
              <Button
                title={allMatches ? 'Masquer' : `Voir les ${matches.length - 1} autres`}
                variant="ghost"
                icon={allMatches ? 'chevron-up' : 'chevron-down'}
                onPress={() => setAllMatches(!allMatches)}
              />
            ) : null}
          </>
        ) : null}
      </ProfileView>
    </Screen>
  );
}

