// Détail d'une équipe : code d'invitation, joueurs, départ.
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Share, Text, View } from 'react-native';
import { Gradient, Hero } from '../../components/brand';
import { Avatar, Button, Card, ErrorText, Kicker, Loading, Pill, readableOn, Screen, TeamCrest, colors, font, s } from '../../components/ui';
import { ApiError, del, get, Match, post, Team } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { dayLabel, formatLabel, levelLabel, POSITIONS } from '../../lib/format';
import { GradeBadge, RoleBadge } from '../../components/Grade';
import { StreakBadge, StreakCard } from '../../components/Streak';

function ask(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Non', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Oui', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<Match[]>([]);

  const load = useCallback(async () => {
    try {
      setTeam(await get<Team>(`/teams/${id}`));
      get<{ items: Match[] }>(`/teams/${id}/results`).then((r) => setResults(r.items)).catch(() => setResults([]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Équipe introuvable.');
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after ? after() : load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    }
  };

  if (!team) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;
  const captain = team.my_role === 'captain';

  return (
    <Screen>
      <Stack.Screen options={{ title: team.name }} />
      <Hero
        colors={[team.color_primary, team.color_primary, team.color_secondary]}
        kicker={captain ? 'Tu es capitaine' : team.my_role ? 'Ton équipe' : 'Équipe'}
        kickerColor={readableOn(team.color_primary)}
        title=""
      >
        <View style={[s.row, { gap: 14 }]}>
          <TeamCrest name={team.name} logo={team.logo_url} primary={team.color_secondary} secondary={team.color_primary} size={76} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...font.extrabold, fontSize: 26, lineHeight: 32, color: readableOn(team.color_primary) }}>{team.name}</Text>
            <StreakBadge count={team.streak?.current} size="md" onDark />
            <Text style={{ ...font.regular, fontSize: 13, color: readableOn(team.color_primary), opacity: 0.9 }}>
              {[`${team.members_count} joueur${team.members_count > 1 ? 's' : ''}`, team.city, team.usual_format ? formatLabel(team.usual_format) : null, team.founded_year ? `depuis ${team.founded_year}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>
        {team.description ? (
          <Text style={{ ...font.medium, fontSize: 14, lineHeight: 20, marginTop: 10, color: readableOn(team.color_primary) }}>{team.description}</Text>
        ) : null}
        {team.recruiting ? (
          <View style={{ marginTop: 10 }}>
            <Pill text="On recrute !" tone="dark" />
          </View>
        ) : null}
      </Hero>
      {!team.my_role ? (
        <Button title="Défier cette équipe" icon="flash" onPress={() => router.push({ pathname: '/challenge/new', params: { to: String(team.id) } })} />
      ) : null}
      {team.my_role ? (
        <Button
          title={team.chat_unread ? `Discussion d'équipe · ${team.chat_unread}` : "Discussion d'équipe"}
          icon="chatbubbles-outline"
          variant={team.chat_unread ? 'primary' : 'dark'}
          onPress={() => router.push(`/chat/team/${team.id}`)}
        />
      ) : null}
      {captain ? (
        <Button title="Personnaliser l'équipe" icon="color-palette-outline" variant="dark" onPress={() => router.push(`/team/edit/${team.id}`)} />
      ) : null}

      <StreakCard streak={team.streak} />
      {results.length ? (
        <View style={{ gap: 6 }}>
          <Kicker>Derniers résultats</Kicker>
          {results.slice(0, 5).map((r) => {
            const home = r.home_team?.id === team.id;
            const opp = home ? r.away_team : r.home_team;
            const mine = home ? r.score?.home : r.score?.away;
            const theirs = home ? r.score?.away : r.score?.home;
            const res = r.score?.winner_team_id === team.id ? 'V' : r.score?.winner_team_id === 0 ? 'N' : 'D';
            const tone = { V: colors.success, N: '#9e9e9e', D: colors.danger }[res];
            return (
              <Card key={r.id} onPress={() => router.push(`/match/${r.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ ...font.bold, fontSize: 12, color: '#fff' }}>{res}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.bold, color: colors.ink }}>contre {opp?.name ?? '?'}</Text>
                  <Text style={s.sub}>{dayLabel(new Date(r.starts_at))} · {r.venue.name}</Text>
                </View>
                <Text style={{ ...font.black, fontSize: 18, color: colors.ink }}>
                  {mine} - {theirs}
                </Text>
              </Card>
            );
          })}
        </View>
      ) : null}

      {team.invite_code ? (
        <Gradient tone="night" style={{ borderRadius: 20, padding: 18, gap: 10 }}>
          <Kicker color={colors.orange1}>Code d'invitation</Kicker>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(team.invite_code!);
              setCopied(true);
            }}
          >
            <Text style={{ color: colors.orange1, fontSize: 32, ...font.black, letterSpacing: 4 }}>{team.invite_code}</Text>
          </Pressable>
          <Text style={{ ...font.regular, color: colors.chalk, opacity: 0.8 }}>{copied ? 'Copié !' : 'Touche le code pour le copier.'}</Text>
          <Button
            title="Inviter des joueurs"
            icon="share-social-outline"
            onPress={() =>
              Share.share({ message: `Rejoins ${team.name} sur Supercity avec le code ${team.invite_code}` })
            }
          />
          {captain ? (
            <Text style={{ ...font.semibold, color: colors.chalk, opacity: 0.7, textAlign: 'center' }} onPress={() => act(() => post(`/teams/${team.id}/invite-code`))}>
              Générer un nouveau code
            </Text>
          ) : null}
        </Gradient>
      ) : null}

      <Kicker>Effectif</Kicker>
      {team.members?.map((m, i) => (
        <Card key={m.id} index={i} style={{ paddingVertical: 12 }} onPress={() => router.push(`/user/${m.id}`)}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Avatar name={m.display_name} uri={m.avatar_url} size={40} tone={m.accent} />
            <Text style={{ ...font.bold, fontSize: 16, flex: 1, color: colors.ink }}>
              {m.display_name}
              {m.shirt_number != null ? <Text style={{ color: colors.orange2 }}>  #{m.shirt_number}</Text> : null}
            </Text>
            <GradeBadge grade={m.grade} />
            <RoleBadge role={m.site_role} />
            {m.role === 'captain' ? <Pill text="Capitaine" /> : null}
          </View>
          <Text style={s.sub}>
            {[POSITIONS.find((p) => p.value === m.position)?.label, m.level ? levelLabel(m.level) : null].filter(Boolean).join(' · ') || 'Profil à compléter'}
          </Text>
          {captain && m.id !== user?.id ? (
            <View style={[s.row, { gap: 16 }]}>
              <Text
                style={{ color: colors.orange2, ...font.semibold }}
                onPress={async () => {
                  if (await ask('Passer le brassard ?', `${m.display_name} deviendra capitaine.`)) act(() => post(`/teams/${team.id}/captain`, { user_id: m.id }));
                }}
              >
                Nommer capitaine
              </Text>
              <Text
                style={{ color: colors.danger, ...font.semibold }}
                onPress={async () => {
                  if (await ask('Retirer ce joueur ?', `${m.display_name} ne fera plus partie de l'équipe.`)) act(() => del(`/teams/${team.id}/members/${m.id}`));
                }}
              >
                Retirer
              </Text>
            </View>
          ) : null}
        </Card>
      ))}

      <ErrorText>{error}</ErrorText>
      {team.my_role ? (
        <Button
          title="Quitter l'équipe"
          variant="danger"
          onPress={async () => {
            const alone = team.members_count === 1;
            if (await ask("Quitter l'équipe ?", alone ? "Tu es le dernier joueur : l'équipe sera supprimée." : 'Tu pourras revenir avec le code.'))
              act(() => del(`/teams/${team.id}/members/me`), () => router.back());
          }}
        />
      ) : null}
    </Screen>
  );
}
