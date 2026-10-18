// Détail d'un match : infos, joueurs, inscription.
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { statusPill } from '../../components/MatchCard';
import { Gradient, Hero } from '../../components/brand';
import { Avatar, Button, Card, colors, ErrorText, IconButton, Label, Loading, Pill, s, Screen, Success, TeamCrest, font } from '../../components/ui';
import { ApiError, del, get, JoinResult, Match, post, Rival, Team } from '../../lib/api';
import { euros, openStripe, returnUrl } from '../../lib/pay';
import { distanceLabel, formatLabel, formatShort, levelLabel, orgKindLabel, POSITIONS, surfaceLabel, timeLabel, whenLabel } from '../../lib/format';

/** 90 min, 4 h, 2 h 30 */
function durationLabel(min: number): string {
  if (min < 120) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ''}`;
}
import { GradeBadge, RoleBadge } from '../../components/Grade';
import { ScoreCard } from '../../components/ScoreCard';
import { BonusBanner, KingCard, StreakBadge } from '../../components/Streak';
import { useAuth } from '../../lib/auth';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Non', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Oui', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [m, setM] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { user } = useAuth();
  const moderator = user?.site_role === 'moderator' || user?.site_role === 'admin';

  const load = useCallback(async () => {
    try {
      let match = await get<Match>(`/matches/${id}`);
      // Retour de la page de paiement (ou webhook en retard) : on vérifie le paiement chez Stripe.
      if (match.my_status === 'pending') match = await post<Match>(`/matches/${id}/pay/confirm`).catch(() => match);
      setM(match);
      setTeams((await get<{ items: Team[] }>('/me/teams')).items);
      if (match.home_team && !match.away_team) {
        get<{ items: Rival[] }>(`/matches/${id}/rivals`).then((r) => setRivals(r.items)).catch(() => setRivals([]));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Match introuvable.');
    }
  }, [id]);

  // Rechargé au retour sur l'écran (après avoir noté les joueurs, par exemple).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (fn: () => Promise<Match>) => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      setM(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  // Paiement de la place : page Stripe, puis vérification au retour.
  const pay = async (checkoutUrl: string | null | undefined, current: Match): Promise<Match> => {
    if (!checkoutUrl) return current;
    await openStripe(checkoutUrl, returnUrl(`match/${current.id}`));
    const after = await post<Match>(`/matches/${current.id}/pay/confirm`);
    if (after.my_status === 'registered') setMsg('Paiement reçu, ta place est confirmée !');
    return after;
  };

  if (!m) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  const cancelled = m.status === 'cancelled';
  const closed = cancelled || m.status === 'played';
  const inMatch = m.my_status === 'registered' || m.my_status === 'waitlist' || m.my_status === 'pending';
  const paid = m.price_cents > 0 && !m.is_organizer;
  const total = m.price_cents + m.fee_cents;
  const refundable = new Date(m.starts_at).getTime() - Date.now() > 24 * 3600 * 1000;
  const leaveText =
    m.my_status === 'pending'
      ? 'Ta place réservée sera libérée.'
      : m.my_paid
        ? refundable
          ? `Ta place ira au premier joueur en liste d'attente et tu seras remboursé de ${euros(m.price_cents)} (les frais de service restent dus).`
          : "À moins de 24 h du match, ta place n'est pas remboursée."
        : "Ta place ira au premier joueur en liste d'attente."
  const myTeamIds = new Set(teams.map((t) => t.id));
  const teamForMatch = [m.home_team, m.away_team].find((t) => t && myTeamIds.has(t.id));
  const seekOpponent = !closed && !!m.home_team && !m.away_team && teams.some((t) => t.id === m.home_team!.id && t.my_role === 'captain');
  const registered = m.players?.filter((p) => p.status === 'registered') ?? [];
  const waiting = m.players?.filter((p) => p.status === 'waitlist') ?? [];

  const share = () =>
    Share.share({
      message: `${m.title ?? formatLabel(m.format)} ${whenLabel(m.starts_at)} à ${m.venue.name}. Viens jouer sur Supercity : supercity://match/${m.id}`,
    });
  // Action principale, fixée en bas : s'inscrire, payer sa place, noter les joueurs, ou l'état du match.
  const primary = m.ratings_left != null ? (
    <Button
      title={m.ratings_left ? `Noter les joueurs · ${m.ratings_left}` : 'Revoir mes notes'}
      icon="star"
      variant={m.ratings_left ? 'primary' : 'ghost'}
      onPress={() => router.push(`/rate/${m.id}`)}
      style={{ flex: 1 }}
    />
  ) : closed ? (
    <View style={[st.state, { flex: 1 }]}>
      <Text style={st.stateText}>{cancelled ? 'Ce match a été annulé.' : 'Match terminé.'}</Text>
    </View>
  ) : m.my_status === 'pending' ? (
    <Button
      title={`Payer ma place · ${euros(total)}`}
      icon="card-outline"
      loading={busy}
      style={{ flex: 1 }}
      onPress={() => act(async () => pay((await post<{ checkout_url: string }>(`/matches/${m.id}/pay`, { return_url: returnUrl(`match/${m.id}`) })).checkout_url, m))}
    />
  ) : inMatch ? (
    <View style={[st.state, { flex: 1 }]}>
      <Ionicons name={m.my_status === 'waitlist' ? 'time' : 'checkmark-circle'} size={20} color={colors.success} />
      <Text style={st.stateText}>{m.my_status === 'waitlist' ? "Tu es en liste d'attente" : 'Tu es inscrit, à toi de jouer !'}</Text>
    </View>
  ) : (
    <Button
      title={m.spots_left > 0 ? (paid && !m.my_paid ? `Je joue · ${euros(total)}` : 'Je joue') : "Liste d'attente"}
      icon="football"
      loading={busy}
      style={{ flex: 1 }}
      onPress={() =>
        act(async () => {
          const r = await post<JoinResult>(`/matches/${m.id}/join`, { ...(teamForMatch ? { team_id: teamForMatch.id } : {}), return_url: returnUrl(`match/${m.id}`) });
          return pay(r.checkout_url, r);
        })
      }
    />
  );
  const footer = (
    <>
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      {!closed && !inMatch && paid && m.spots_left === 0 ? <Text style={s.sub}>Si une place se libère, tu auras quelques heures pour la payer.</Text> : null}
      <View style={[s.row, { gap: 10 }]}>
        {primary}
        <IconButton icon="share-outline" label="Partager le match" onPress={share} />
      </View>
    </>
  );

  return (
    <Screen footer={footer}>
      <Stack.Screen options={{ title: m.title ?? m.venue.name }} />
      <Hero
        colors={cancelled ? ['#a59a93', '#5c524c'] : undefined}
        kicker={`${m.kind === 'tournament' ? 'Tournoi' : formatLabel(m.format)} · ${formatShort(m.format)}`}
        title={m.title ?? whenLabel(m.starts_at)}
        sub={[m.title ? whenLabel(m.starts_at) : null, durationLabel(m.duration_min), levelLabel(m.level), `organisé par ${m.organization?.name ?? m.organizer.display_name}`].filter(Boolean).join(' · ')}
      >
        {cancelled ? (
          <View style={st.cancelled}>
            <Ionicons name="close-circle" size={18} color={colors.chalk} />
            <Text style={st.cancelledText}>Match annulé</Text>
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>{statusPill(m)}</View>
        )}
        {cancelled ? null : (
        <View style={{ marginTop: 12, gap: 6 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(31,26,23,.25)', overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(1, m.players_count / m.max_players) * 100}%`, height: 8, backgroundColor: colors.night }} />
          </View>
          <Text style={{ ...font.semibold, fontSize: 12, color: colors.chalk }}>
            {m.players_count}/{m.max_players} joueurs{m.spots_left > 0 ? ` · ${m.spots_left} place${m.spots_left > 1 ? 's' : ''} libre${m.spots_left > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        )}
      </Hero>

      {m.home_team || m.away_team ? (
        <Gradient tone="night" style={{ borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            {m.home_team ? <TeamCrest name={m.home_team.name} logo={m.home_team.logo_url} primary={m.home_team.color_primary} secondary={m.home_team.color_secondary} size={52} /> : <Avatar name="?" size={52} />}
            <Text style={{ ...font.extrabold, fontSize: 14, color: colors.chalk, textAlign: 'center' }}>{m.home_team?.name ?? 'Joueurs libres'}</Text>
            <View style={{ alignSelf: 'center' }}>
              <StreakBadge count={m.home_team?.streak} onDark />
            </View>
          </View>
          {m.score?.home != null && m.score.away != null ? (
            <View style={{ alignItems: 'center', alignSelf: 'center' }}>
              <Text style={{ ...font.black, fontSize: 30, color: colors.chalk }}>
                {m.score.home} - {m.score.away}
              </Text>
              {m.score.status !== 'confirmed' ? (
                <Text style={{ ...font.semibold, fontSize: 10, color: colors.orange1 }}>{m.score.status === 'disputed' ? 'CONTESTÉ' : 'À CONFIRMER'}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ ...font.black, fontSize: 22, color: colors.orange1, alignSelf: 'center' }}>VS</Text>
          )}
          <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            {m.away_team ? <TeamCrest name={m.away_team.name} logo={m.away_team.logo_url} primary={m.away_team.color_primary} secondary={m.away_team.color_secondary} size={52} /> : <Avatar name="?" size={52} tone="night" />}
            <Text style={{ ...font.extrabold, fontSize: 14, color: colors.chalk, textAlign: 'center' }}>{m.away_team?.name ?? 'Adversaire à trouver'}</Text>
            <View style={{ alignSelf: 'center' }}>
              <StreakBadge count={m.away_team?.streak} onDark />
            </View>
          </View>
        </Gradient>
      ) : null}

      <ScoreCard
        key={`${m.score?.status}-${m.score?.home}-${m.score?.away}`}
        m={m}
        busy={busy}
        moderator={moderator}
        onReport={(home, away) => act(() => post<Match>(`/matches/${m.id}/score`, { home_score: home, away_score: away }))}
        onConfirm={() => act(() => post<Match>(`/matches/${m.id}/score/confirm`))}
        onModerate={(home, away) => act(() => post<Match>(`/mod/matches/${m.id}/score`, { home_score: home, away_score: away }))}
      />

      {m.bonus && !closed ? <BonusBanner event={m.bonus} compact /> : null}

      {seekOpponent ? (
        <Card style={{ gap: 10, borderColor: colors.orange1, borderWidth: 2 }}>
          <Text style={{ ...font.semibold, fontSize: 11, letterSpacing: 1.6, color: colors.orange2 }}>CHERCHE ADVERSAIRE</Text>
          {rivals.length ? (
            <>
              <Text style={[s.sub, { color: colors.ink }]}>Ces équipes jouent sur ce terrain à quelques heures près. Défie-les !</Text>
              {rivals.map((r) => (
                <View key={r.team.id} style={[s.row, { gap: 10 }]}>
                  <TeamCrest name={r.team.name} logo={r.team.logo_url} primary={r.team.color_primary} secondary={r.team.color_secondary} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...font.bold, color: colors.ink }}>{r.team.name}</Text>
                    <Text style={s.sub}>Joue ici à {timeLabel(new Date(r.starts_at))}</Text>
                  </View>
                  <Button title="Défier" icon="flash" onPress={() => router.push({ pathname: '/challenge/new', params: { to: String(r.team.id), match: String(m.id) } })} />
                </View>
              ))}
            </>
          ) : (
            <Text style={[s.sub, { color: colors.ink }]}>Ton équipe n'a pas encore d'adversaire pour ce match.</Text>
          )}
          <Button title="Chercher une équipe" variant="ghost" icon="search" onPress={() => router.push({ pathname: '/team/find', params: { match: String(m.id) } })} />
        </Card>
      ) : null}

      <Card>
        <View style={s.row}>
          <Ionicons name="location" size={18} color={colors.orange2} />
          <Text style={{ ...font.bold, fontSize: 16, flex: 1, color: colors.ink }}>{m.venue.name}</Text>
        </View>
        <Text style={s.sub}>{m.venue.address}</Text>
        <Text style={s.sub}>
          {surfaceLabel(m.venue.surface)}
          {m.venue.covered ? ' · couvert' : ''}
          {m.venue.distance_km !== null ? ` · ${distanceLabel(m.venue.distance_km)}` : ''}
        </Text>
      </Card>

      <KingCard king={m.venue.king} />

      {m.organization ? (
        <Card onPress={() => router.push(`/org/${m.organization!.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="briefcase-outline" size={22} color={colors.orange2} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...font.bold, fontSize: 16, color: colors.ink }}>{m.organization.name}</Text>
            <Text style={s.sub}>{orgKindLabel(m.organization.kind)}{m.organization.city ? ` · ${m.organization.city}` : ''} · voir ses autres créneaux</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.dim} />
        </Card>
      ) : null}

      {m.price_cents > 0 ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="card-outline" size={22} color={colors.orange2} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...font.bold, fontSize: 16, color: colors.ink }}>{euros(m.price_cents)} la place</Text>
            <Text style={s.sub}>
              {m.is_organizer
                ? `Chaque joueur paie ${euros(total)}, frais de service compris. Tu reçois ${euros(m.payout_cents ?? m.price_cents)} par joueur, commission Supercity déduite.`
                : `+ ${euros(m.fee_cents)} de frais de service. Remboursé si tu te désistes plus de 24 h avant.`}
            </Text>
          </View>
          {m.my_paid ? <Pill text="Payé" tone="green" /> : null}
        </Card>
      ) : null}

      {m.my_status === 'pending' && !closed ? (
        <Card style={{ gap: 10, borderColor: colors.orange2, borderWidth: 2 }}>
          <Text style={{ ...font.bold, fontSize: 15, color: colors.ink }}>Ta place est réservée jusqu'à {m.my_hold_until ? timeLabel(new Date(m.my_hold_until)) : 'bientôt'}</Text>
          <Text style={s.sub}>Paie-la pour confirmer ton inscription, sinon elle passera au joueur suivant.</Text>
        </Card>
      ) : null}

      {m.description ? <Text style={[s.sub, { color: colors.ink }]}>{m.description}</Text> : null}

      {!closed && inMatch && m.my_status !== 'pending' ? (
        <Button
          title="Me désister"
          variant="ghost"
          loading={busy}
          onPress={async () => {
            if (await confirm('Te désister ?', leaveText))
              act(async () => {
                const r = await del<JoinResult>(`/matches/${m.id}/join`);
                if (r.refunded_cents) setMsg(`Remboursement de ${euros(r.refunded_cents)} en route vers ta carte.`);
                return r;
              });
          }}
        />
      ) : null}

      <View style={{ gap: 8 }}>
        <Label>
          Joueurs {m.players_count}/{m.max_players}
        </Label>
        {registered.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/user/${p.id}`)} style={[s.row, { paddingVertical: 4 }]}>
            <Avatar name={p.display_name} uri={p.avatar_url} size={38} tone={p.accent} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...font.semibold, color: colors.ink }}>{p.display_name}</Text>
              <View style={[s.row, { gap: 6 }]}>
                <GradeBadge grade={p.grade} />
                <RoleBadge role={p.site_role} />
              </View>
            </View>
            {p.position ? <Pill text={POSITIONS.find((x) => x.value === p.position)?.label ?? ''} tone="grey" /> : null}
          </Pressable>
        ))}
        {waiting.length ? <Label>Liste d'attente</Label> : null}
        {waiting.map((p, i) => (
          <Text key={p.id} style={s.sub}>
            {i + 1}. {p.display_name}
          </Text>
        ))}
      </View>

      {m.is_organizer && !closed ? (
        <Button
          title="Annuler le match"
          variant="danger"
          onPress={async () => {
            if (await confirm('Annuler le match ?', m.price_cents > 0 ? 'Les joueurs inscrits seront prévenus et remboursés en entier.' : 'Les joueurs inscrits verront le match comme annulé.')) act(() => post<Match>(`/matches/${m.id}/cancel`));
          }}
        />
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, backgroundColor: colors.night, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  cancelledText: { ...font.bold, fontSize: 13, color: colors.chalk },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 },
  stateText: { ...font.semibold, fontSize: 14, color: colors.ink, flexShrink: 1 },
});
