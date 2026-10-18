// Profil public d'un joueur, tel que tout le monde le voit : bannière, carte FUT, grade, infos, équipes, publications. L'onglet Profil affiche le même, avec ses boutons à soi.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FadeIn, Hero } from './brand';
import { BannerPattern, bannerColors, FramedAvatar, TitleTag } from './Cosmetics';
import { GradeBadge, GradeCard, RoleBadge } from './Grade';
import { PlayerCardView } from './PlayerCard';
import { PostCard } from './PostCard';
import { Card, colors, font, Kicker, Pill, s, TeamCrest } from './ui';
import { Post, PublicProfile } from '../lib/api';
import { FEET, LEVELS, POSITIONS } from '../lib/format';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function ProfileView({
  p,
  posts,
  setPosts,
  onAvatarPress,
  actions,
  children,
}: {
  p: PublicProfile;
  posts: Post[];
  setPosts: (fn: (prev: Post[]) => Post[]) => void;
  onAvatarPress?: () => void;
  /** Boutons sous la bannière (Modifier, Boutique, Partager, Réglages). */
  actions?: ReactNode;
  /** Ce que seul le joueur voit de son profil, juste sous les boutons. */
  children?: ReactNode;
}) {
  const since = new Date(p.member_since);
  const facts: [React.ComponentProps<typeof Ionicons>['name'], string, string | null][] = [
    ['football-outline', 'Poste', p.position ? POSITIONS.find((x) => x.value === p.position)!.label : null],
    ['stats-chart-outline', 'Niveau', p.level ? LEVELS[p.level - 1] : null],
    ['footsteps-outline', 'Pied fort', p.strong_foot ? FEET.find((x) => x.value === p.strong_foot)!.label : null],
    ['heart-outline', 'Club de cœur', p.favorite_club],
    ['location-outline', 'Ville', p.city],
  ];
  const avatar = <FramedAvatar frame={p.cosmetics?.frame} name={p.display_name} uri={p.avatar_url} size={88} />;

  return (
    <>
      <Hero
        tone={p.accent}
        colors={bannerColors(p.cosmetics?.banner)}
        title=""
        kicker={`Sur Supercity depuis ${MONTHS[since.getMonth()]} ${since.getFullYear()}`}
        kickerColor={p.cosmetics?.banner ? colors.chalk : p.accent === 'nuit' ? colors.orange1 : colors.night}
      >
        <BannerPattern banner={p.cosmetics?.banner} />
        <View style={st.head}>
          {onAvatarPress ? (
            <Pressable onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel="Changer ma photo">
              {avatar}
            </Pressable>
          ) : (
            avatar
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.name}>{p.display_name}</Text>
            <TitleTag title={p.cosmetics?.title} />
            <View style={[s.row, { gap: 6 }]}>
              <GradeBadge grade={p.grade} size="md" />
              <RoleBadge role={p.site_role} />
            </View>
            {p.bio ? <Text style={st.bio}>{p.bio}</Text> : null}
          </View>
          {p.shirt_number != null ? (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shirt" size={46} color={colors.night} />
              <Text style={st.shirtNum}>{p.shirt_number}</Text>
            </View>
          ) : null}
        </View>
        <View style={st.stats}>
          {[
            [p.stats?.played ?? 0, 'Matchs joués'],
            [p.stats?.organized ?? 0, 'Organisés'],
            [p.teams?.length ?? 0, p.teams?.length === 1 ? 'Équipe' : 'Équipes'],
          ].map(([n, l]) => (
            <View key={String(l)} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={st.statNum}>{n}</Text>
              <Text style={st.statLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </Hero>
      {actions}
      {children}
      {p.card ? <PlayerCardView card={p.card} name={p.display_name} uri={p.avatar_url} position={p.position} /> : null}
      <GradeCard grade={p.grade} />

      <Card index={0} style={{ gap: 12 }}>
        {facts.map(([icon, label, value]) => (
          <View key={label} style={[s.row, { justifyContent: 'space-between' }]}>
            <View style={s.row}>
              <Ionicons name={icon} size={18} color={colors.orange2} />
              <Text style={st.factLabel}>{label}</Text>
            </View>
            <Text style={[st.factValue, !value && { color: colors.dim }]}>{value ?? '—'}</Text>
          </View>
        ))}
      </Card>

      {p.teams?.length ? <Kicker>Équipes</Kicker> : null}
      {(p.teams ?? []).map((t, i) => (
        <FadeIn key={t.id} index={i + 1}>
          <Pressable onPress={() => router.push(`/team/${t.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={44} />
              <Text style={[st.factValue, { flex: 1 }]}>{t.name}</Text>
              {t.role === 'captain' ? <Pill text="Capitaine" /> : null}
            </Card>
          </Pressable>
        </FadeIn>
      ))}

      {posts.length ? <Kicker>Publications</Kicker> : null}
      {posts.map((x, i) => (
        <PostCard
          key={x.id}
          p={x}
          index={i}
          onChange={(np) => setPosts((prev) => prev.map((y) => (y.id === np.id ? np : y)))}
          onRemove={(pid) => setPosts((prev) => prev.filter((y) => y.id !== pid))}
        />
      ))}
    </>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { ...font.extrabold, fontSize: 24, lineHeight: 30, color: colors.chalk },
  bio: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.chalk },
  shirtNum: { ...font.black, position: 'absolute', top: 12, fontSize: 17, color: colors.chalk },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,248,241,.3)' },
  statNum: { ...font.black, fontSize: 22, color: colors.chalk },
  statLabel: { ...font.medium, fontSize: 11, color: colors.chalk, opacity: 0.85 },
  factLabel: { ...font.medium, fontSize: 14, color: colors.dim },
  factValue: { ...font.bold, fontSize: 14, color: colors.ink },
});
