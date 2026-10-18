// Appli web sur grand écran, à la manière d'un réseau social sur ordinateur :
// menu à gauche, contenu au centre, prochains matchs et amis en ligne à droite.
// Avant connexion : accueil plein écran (DesktopWelcome), puis formulaires dans une colonne. Sur téléphone, rien ne change.
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gradient } from './brand';
import { PresenceDot } from './Friends';
import { Avatar, colors, font } from './ui';
import { Friends, get, Match } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useBadge } from '../lib/badge';
import { formatLabel, whenLabel } from '../lib/format';

/** Largeur de la colonne de contenu (et des feuilles qui montent du bas de l'écran) sur grand écran. */
export const APP_WIDTH = 600;

/** Style à ajouter aux feuilles des fenêtres modales pour qu'elles restent à une largeur lisible. */
export const sheetWidth = { width: '100%', maxWidth: 560, alignSelf: 'center' } as const;

type Layout = 'phone' | 'compact' | 'wide' | 'full';

/** phone : barre d'onglets en bas. compact : menu en icônes. wide : menu complet. full : menu + colonne de droite. */
export function useWebLayout(): Layout {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 760) return 'phone';
  if (width < 1100) return 'compact';
  if (width < 1260) return 'wide';
  return 'full';
}

type IconName = ComponentProps<typeof Ionicons>['name'];
type Hover = { pressed: boolean; hovered?: boolean };

const NAV: { path: string; label: string; icon: IconName; on: IconName; badge?: 'unread' | 'friend_requests' }[] = [
  { path: '/', label: 'Matchs', icon: 'football-outline', on: 'football' },
  { path: '/feed', label: 'Fil', icon: 'newspaper-outline', on: 'newspaper' },
  { path: '/teams', label: 'Équipes', icon: 'people-outline', on: 'people' },
  { path: '/notifications', label: 'Notifications', icon: 'notifications-outline', on: 'notifications', badge: 'unread' },
  { path: '/friends', label: 'Amis', icon: 'heart-outline', on: 'heart', badge: 'friend_requests' },
  { path: '/profile', label: 'Profil', icon: 'person-outline', on: 'person' },
  { path: '/settings', label: 'Réglages', icon: 'settings-outline', on: 'settings' },
];

const isOn = (path: string, current: string) => (path === '/' ? current === '/' : current === path || current.startsWith(path + '/'));

function Sidebar({ compact }: { compact: boolean }) {
  const path = usePathname();
  const badge = useBadge();
  const { user } = useAuth();
  return (
    <View style={[st.side, compact && st.sideCompact]}>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="Supercity, accueil" style={st.logo}>
        <Image source={require('../../assets/icon.png')} style={st.logoImg} />
        {!compact ? <Text style={st.logoText}>Supercity</Text> : null}
      </Pressable>
      <View style={{ gap: 2 }} accessibilityRole="menu">
        {NAV.map((n) => {
          const on = isOn(n.path, path);
          const count = n.badge ? badge[n.badge] : 0;
          return (
            <Pressable
              key={n.path}
              onPress={() => router.navigate(n.path as never)}
              accessibilityRole="menuitem"
              accessibilityLabel={count ? `${n.label}, ${count} nouveau${count > 1 ? 'x' : ''}` : n.label}
              accessibilityState={{ selected: on }}
              style={(s) => [st.item, compact && st.itemCompact, (s as Hover).hovered && st.itemHover]}
            >
              <View>
                <Ionicons name={on ? n.on : n.icon} size={25} color={on ? colors.orange2 : colors.ink} />
                {count ? (
                  <View style={st.badge}>
                    <Text style={st.badgeText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                ) : null}
              </View>
              {!compact ? <Text style={[st.itemText, on && st.itemOn]}>{n.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={() => router.navigate('/create')}
        accessibilityRole="button"
        accessibilityLabel="Organiser un match"
        style={(s) => [st.cta, compact && st.ctaCompact, (s as Hover).hovered && { transform: [{ scale: 1.02 }] }]}
      >
        <Gradient style={StyleSheet.absoluteFill} />
        <Ionicons name="add" size={compact ? 26 : 22} color={colors.chalk} />
        {!compact ? <Text style={st.ctaText}>Organiser un match</Text> : null}
      </Pressable>
      <View style={{ flex: 1 }} />
      {user ? (
        <Pressable
          onPress={() => router.navigate('/profile')}
          accessibilityRole="link"
          accessibilityLabel={`Mon profil, ${user.display_name}`}
          style={(s) => [st.me, compact && st.itemCompact, (s as Hover).hovered && st.itemHover]}
        >
          <Avatar name={user.display_name} uri={user.avatar_url} size={40} />
          {!compact ? (
            <View style={{ flex: 1 }}>
              <Text style={st.meName} numberOfLines={1}>{user.display_name}</Text>
              <Text style={st.meSub} numberOfLines={1}>{user.city ?? 'Mon profil'}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function Rail() {
  const path = usePathname();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [friends, setFriends] = useState<Friends['friends'] | null>(null);
  // Rechargé à chaque changement d'écran : inscription à un match, ami ajouté…
  useEffect(() => {
    get<{ items: Match[] }>('/me/matches', { limit: 3 }).then((r) => setMatches(r.items.slice(0, 3))).catch(() => undefined);
    get<Friends>('/me/friends').then((r) => setFriends(r.friends)).catch(() => undefined);
  }, [path]);
  const around = friends?.filter((f) => f.presence && f.presence.state !== 'offline') ?? [];
  return (
    <ScrollView style={st.rail} contentContainerStyle={{ gap: 16, paddingVertical: 16 }}>
      <View style={st.box}>
        <Text style={st.boxTitle}>Tes prochains matchs</Text>
        {matches && !matches.length ? <Text style={st.boxEmpty}>Aucun match prévu. Trouves-en un près de chez toi !</Text> : null}
        {matches?.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => router.navigate(`/match/${m.id}` as never)}
            accessibilityRole="link"
            style={(s) => [st.row, (s as Hover).hovered && st.rowHover]}
          >
            <View style={st.rowIcon}>
              <Ionicons name="football" size={18} color={colors.orange2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle} numberOfLines={1}>{m.title ?? formatLabel(m.format)}</Text>
              <Text style={st.rowSub} numberOfLines={1}>{`${whenLabel(m.starts_at)} · ${m.venue.name}`}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => router.navigate('/')} accessibilityRole="link">
          <Text style={st.more}>Trouver un match</Text>
        </Pressable>
      </View>

      <View style={st.box}>
        <Text style={st.boxTitle}>Amis en ligne</Text>
        {friends && !around.length ? <Text style={st.boxEmpty}>Personne pour l'instant.</Text> : null}
        {around.slice(0, 6).map((f) => (
          <Pressable
            key={f.id}
            onPress={() => router.navigate(`/user/${f.id}` as never)}
            accessibilityRole="link"
            style={(s) => [st.row, (s as Hover).hovered && st.rowHover]}
          >
            <View>
              <Avatar name={f.display_name} uri={f.avatar_url} size={36} />
              <View style={{ position: 'absolute', right: -1, bottom: -1 }}>
                <PresenceDot p={f.presence} size={12} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle} numberOfLines={1}>{f.display_name}</Text>
              <Text style={st.rowSub} numberOfLines={1}>{f.presence?.state === 'match' ? 'En match' : 'En ligne'}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => router.navigate('/friends')} accessibilityRole="link">
          <Text style={st.more}>{friends?.length ? 'Tous mes amis' : 'Trouver des amis'}</Text>
        </Pressable>
      </View>

      <View style={st.links}>
        {[
          ['Aide', '/help'],
          ['Conditions', '/cgu'],
          ['Mentions légales', '/mentions'],
        ].map(([t, p]) => (
          <Text key={p} style={st.link} onPress={() => router.navigate(p as never)}>
            {t}
          </Text>
        ))}
        <Text style={st.link} onPress={() => globalThis.open?.('/confidentialite/', '_blank')}>
          Confidentialité
        </Text>
        <Text style={st.link} onPress={() => globalThis.location?.assign('/decouvrir/')}>
          Découvrir Supercity
        </Text>
        <Text style={[st.link, { textDecorationLine: 'none' }]}>© Supercity 2026</Text>
      </View>
    </ScrollView>
  );
}

export function WebFrame({ children }: { children: ReactNode }) {
  const layout = useWebLayout();
  const { user } = useAuth();
  const path = usePathname();
  if (layout === 'phone') return <>{children}</>;
  if (!user) {
    // L'accueil prend toute la page ; inscription, connexion et pages d'aide restent dans une colonne.
    if (path === '/') return <>{children}</>;
    return (
      <View style={[st.outer, { alignItems: 'center' }]}>
        <View style={[st.column, st.authColumn]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[st.outer, { backgroundColor: colors.bg }]}>
      <View style={st.shell}>
        <Sidebar compact={layout === 'compact'} />
        <View style={[st.column, st.main]}>{children}</View>
        {layout === 'full' ? <Rail /> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.night },
  shell: { flex: 1, flexDirection: 'row', justifyContent: 'center', width: '100%', maxWidth: 1260, alignSelf: 'center' },
  column: { flex: 1, width: '100%', maxWidth: APP_WIDTH, overflow: 'hidden', backgroundColor: colors.bg },
  main: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  authColumn: { maxWidth: 480, boxShadow: '0 0 60px rgba(0,0,0,.35)' },

  side: { width: 260, paddingHorizontal: 12, paddingVertical: 14, gap: 14 },
  sideCompact: { width: 88, alignItems: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 6 },
  logoImg: { width: 40, height: 40, borderRadius: 12 },
  logoText: { ...font.black, fontSize: 22, color: colors.ink, letterSpacing: -0.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999 },
  itemCompact: { paddingHorizontal: 12, justifyContent: 'center' },
  itemHover: { backgroundColor: colors.tint },
  itemText: { ...font.medium, fontSize: 18, color: colors.ink },
  itemOn: { ...font.extrabold },
  badge: { position: 'absolute', top: -6, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.orange2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  badgeText: { ...font.bold, fontSize: 10, color: colors.chalk },
  cta: { height: 52, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  ctaCompact: { width: 52 },
  ctaText: { ...font.bold, fontSize: 16, color: colors.chalk },
  me: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 999 },
  meName: { ...font.bold, fontSize: 14.5, color: colors.ink },
  meSub: { ...font.regular, fontSize: 13, color: colors.dim },

  rail: { width: 340, flexGrow: 0, paddingHorizontal: 20 },
  box: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, gap: 4 },
  boxTitle: { ...font.extrabold, fontSize: 19, color: colors.ink, paddingHorizontal: 16, marginBottom: 6 },
  boxEmpty: { ...font.regular, fontSize: 13.5, color: colors.dim, paddingHorizontal: 16, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  rowHover: { backgroundColor: colors.tint },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...font.bold, fontSize: 14, color: colors.ink },
  rowSub: { ...font.regular, fontSize: 12.5, color: colors.dim },
  more: { ...font.semibold, fontSize: 14, color: colors.orange2, paddingHorizontal: 16, paddingTop: 6 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 6 },
  link: { ...font.regular, fontSize: 12.5, color: colors.dim, textDecorationLine: 'underline' },

});
