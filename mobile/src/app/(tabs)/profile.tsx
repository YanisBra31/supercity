// Profil du joueur : son profil public tel que les autres le voient, avec ses boutons à soi (modifier, amis, boutique, réglages).
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { MatchCard } from '../../components/MatchCard';
import { ProfileView } from '../../components/ProfileView';
import { Banner, Button, ErrorText, IconButton, Kicker, Loading, s, Screen } from '../../components/ui';
import { get, Match, Post, PublicProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useBadge } from '../../lib/badge';
import { loadItem, saveItem } from '../../lib/storage';
import { celebrate } from '../../components/Celebration';

export default function Profile() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allMatches, setAllMatches] = useState(false);
  const badge = useBadge();

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      get<{ items: Match[] }>('/me/matches').then((r) => setMatches(r.items)).catch(() => undefined);
      get<PublicProfile>(`/users/${user.id}`).then(setPub).catch(() => undefined);
      get<{ items: Post[] }>('/feed', { author_id: user.id, limit: 10 }).then((r) => setPosts(r.items)).catch(() => undefined);
    }, [user])
  );

  // Nouveau grade ou carte tout juste confirmée depuis la dernière visite : on fête ça une fois.
  useEffect(() => {
    if (!pub?.grade) return;
    const grade = pub.grade;
    (async () => {
      const key = `seen_${pub.id}`;
      const seen = JSON.parse((await loadItem(key)) ?? 'null') as { grade: number; card: boolean } | null;
      const now = { grade: grade.level, card: !!pub.card && !pub.card.estimated };
      if (seen && now.grade > seen.grade) celebrate({ title: `Nouveau grade : ${grade.label}`, text: 'Bien joué, continue comme ça.', icon: 'trophy' });
      else if (seen && now.card && !seen.card) celebrate({ title: 'Ta carte est confirmée', text: `Tes coéquipiers t'ont noté ${pub.card!.overall}.`, icon: 'star' });
      if (!seen || now.grade !== seen.grade || now.card !== seen.card) await saveItem(key, JSON.stringify(now));
    })().catch(() => undefined);
  }, [pub]);

  if (!user) return null;
  if (!pub) return <Loading />;

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
            <IconButton icon="people-outline" label="Mes amis" badge={badge.friend_requests} onPress={() => router.push('/friends')} />
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

