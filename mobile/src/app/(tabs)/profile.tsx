// Profil du joueur : carte personnalisée, grade, boutique, équipes et prochains matchs. Édition et réglages dans leurs écrans.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FadeIn, Hero } from '../../components/brand';
import { MatchCard } from '../../components/MatchCard';
import { Banner, Button, colors, ErrorText, font, Kicker, Pill, s, Screen, TeamCrest } from '../../components/ui';
import { get, Match, PublicProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { FEET, LEVELS, POSITIONS } from '../../lib/format';
import { GradeBadge, GradeCard, RoleBadge } from '../../components/Grade';
import { BannerPattern, bannerColors, FramedAvatar, TitleTag } from '../../components/Cosmetics';

export default function Profile() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pub, setPub] = useState<PublicProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      get<{ items: Match[] }>('/me/matches').then((r) => setMatches(r.items)).catch(() => undefined);
      if (user) get<PublicProfile>(`/users/${user.id}`).then(setPub).catch(() => undefined);
    }, [user])
  );

  if (!user) return null;
  const tags = [
    user.position ? POSITIONS.find((p) => p.value === user.position)!.label : null,
    user.level ? LEVELS[user.level - 1] : null,
    user.strong_foot ? `Pied ${FEET.find((f) => f.value === user.strong_foot)!.label.toLowerCase()}` : null,
    user.favorite_club ? `❤ ${user.favorite_club}` : null,
    user.city,
  ].filter(Boolean) as string[];

  return (
    <Screen top>
      <Hero
        tone={user.accent}
        colors={bannerColors(user.cosmetics?.banner)}
        kicker="Ton profil de joueur"
        kickerColor={user.cosmetics?.banner ? colors.chalk : user.accent === 'nuit' ? colors.orange1 : colors.night}
        title=""
      >
        <BannerPattern banner={user.cosmetics?.banner} />
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Réglages" style={st.gear}>
          <Ionicons name="settings-outline" size={20} color={colors.chalk} />
        </Pressable>
        <View style={st.head}>
          <Pressable onPress={() => router.push('/me/edit')} accessibilityRole="button" accessibilityLabel="Modifier mon profil">
            <FramedAvatar frame={user.cosmetics?.frame} name={user.display_name} uri={user.avatar_url} size={92} />
            <View style={st.camera}>
              <Ionicons name="pencil" size={14} color={colors.chalk} />
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.name} numberOfLines={2}>
              {user.display_name}
            </Text>
            <TitleTag title={user.cosmetics?.title} />
            <View style={[s.row, { gap: 6 }]}>
              <GradeBadge grade={user.grade ?? pub?.grade} size="md" />
              <RoleBadge role={user.site_role} />
            </View>
            {user.bio ? <Text style={st.bio}>{user.bio}</Text> : <Text style={[st.bio, { opacity: 0.7 }]}>Ajoute une bio pour te présenter.</Text>}
          </View>
          {user.shirt_number != null ? (
            <View style={st.shirt}>
              <Ionicons name="shirt" size={46} color={colors.night} />
              <Text style={st.shirtNum}>{user.shirt_number}</Text>
            </View>
          ) : null}
        </View>
        {tags.length ? (
          <View style={[s.row, { flexWrap: 'wrap', marginTop: 12 }]}>
            {tags.map((t) => (
              <Pill key={t} text={t} tone="dark" />
            ))}
          </View>
        ) : null}
        <View style={st.stats}>
          {[
            [pub?.stats?.played ?? 0, 'Matchs joués'],
            [pub?.stats?.organized ?? 0, 'Organisés'],
            [pub?.teams?.length ?? 0, pub?.teams?.length === 1 ? 'Équipe' : 'Équipes'],
          ].map(([n, l]) => (
            <View key={String(l)} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={st.statNum}>{n}</Text>
              <Text style={st.statLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </Hero>

      <View style={s.row}>
        <Button title="Modifier mon profil" icon="pencil" variant="dark" onPress={() => router.push('/me/edit')} style={{ flex: 1 }} />
        <Button title="Voir" icon="eye-outline" variant="ghost" onPress={() => router.push(`/user/${user.id}`)} />
      </View>

      {!user.email_verified ? (
        <Banner icon="mail-unread-outline" title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." onPress={() => router.push('/verify')} />
      ) : null}

      {pub?.teams?.length ? (
        <>
          <Kicker>Mes équipes</Kicker>
          <View style={[s.row, { flexWrap: 'wrap', gap: 12 }]}>
            {pub.teams.map((t, i) => (
              <FadeIn key={t.id} index={i}>
                <Pressable onPress={() => router.push(`/team/${t.id}`)} style={{ alignItems: 'center', gap: 4, width: 76 }}>
                  <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={56} />
                  <Text style={st.teamName} numberOfLines={1}>
                    {t.name}
                  </Text>
                </Pressable>
              </FadeIn>
            ))}
          </View>
        </>
      ) : null}

      {user.suspended_until ? (
        <ErrorText>{`Ton compte est suspendu jusqu'au ${new Date(user.suspended_until).toLocaleDateString('fr-FR')}${user.suspended_reason ? ` (${user.suspended_reason})` : ''}. Tu peux consulter l'appli, mais pas publier ni organiser.`}</ErrorText>
      ) : null}
      <GradeCard grade={user.grade ?? pub?.grade} />
      <Banner
        icon="bag-handle"
        title={user.coins != null ? `Boutique · ${user.coins.toLocaleString('fr-FR')} pièces` : 'Boutique'}
        text="Cadres, bannières et titres pour ton profil. Nouveautés chaque saison."
        onPress={() => router.push('/shop')}
      />

      <Kicker>Mes prochains matchs</Kicker>
      {matches.length ? matches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />) : <Text style={s.sub}>Aucun match prévu. Va voir l'onglet Matchs !</Text>}

    </Screen>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: -4 },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.chalk },
  name: { ...font.extrabold, fontSize: 24, lineHeight: 30, color: colors.chalk },
  bio: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.chalk },
  shirt: { alignItems: 'center', justifyContent: 'center' },
  shirtNum: { ...font.black, position: 'absolute', top: 12, fontSize: 17, color: colors.chalk },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,248,241,.3)' },
  statNum: { ...font.black, fontSize: 22, color: colors.chalk },
  statLabel: { ...font.medium, fontSize: 11, color: colors.chalk, opacity: 0.85 },
  gear: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,26,23,.35)' },
  teamName: { ...font.semibold, fontSize: 12, color: colors.ink, textAlign: 'center' },
});
