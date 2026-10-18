// Organiser un match : format, date, terrain, puis options. Un espace pro publie aussi des tournois et fixe un prix.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlaceButton, PlaceSheet } from '../../components/AddressSearch';
import { defaultTime, firstOpenDay, WhenField } from '../../components/WhenPicker';
import { celebrate } from '../../components/Celebration';
import { Button, Card, Chips, colors, ErrorText, Field, Label, PageHeader, s, Screen, font } from '../../components/ui';
import { ApiError, Format, get, Match, MyOrganization, post, Team, Venue } from '../../lib/api';
import { euros } from '../../lib/pay';
import { dayLabel, distanceLabel, FORMATS, LEVELS, surfaceLabel, timeLabel } from '../../lib/format';
import { Place } from '../../lib/address';
import { Coords, getSearchCenter, setSearchPlace } from '../../lib/location';
import { takeLastVenue } from '../../lib/venueStore';

const TOURNAMENT_HOURS = [2, 3, 4, 6, 8, 10];

export default function CreateMatch() {
  const [format, setFormat] = useState<Format>('city5');
  const [day, setDay] = useState(firstOpenDay);
  const [minutes, setMinutes] = useState<number | null>(() => defaultTime(firstOpenDay()));
  const [venue, setVenue] = useState<Venue | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [q, setQ] = useState('');
  const [center, setCenter] = useState<{ coords: Coords | null; place: Place | null }>({ coords: null, place: null });
  const [placeSheet, setPlaceSheet] = useState(false);
  const [level, setLevel] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
  const [price, setPrice] = useState(0);
  const [org, setOrg] = useState<MyOrganization | null>(null);
  const [asOrg, setAsOrg] = useState(true);
  const [tournament, setTournament] = useState(false);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState(4);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pro = !!org && asOrg;
  const isTournament = pro && tournament;
  const formatPlayers = FORMATS.find((f) => f.value === format)!.players;
  const teamSize = formatPlayers / 2;
  // Tournoi : on compte par équipes (8 équipes par défaut), jusqu'à 200 joueurs.
  const players = maxPlayers ?? (isTournament ? teamSize * 8 : formatPlayers);
  const maxAllowed = isTournament ? 200 : 30;
  const step = isTournament ? teamSize : 1;
  const payouts = pro ? org!.payouts : null;
  const payout = payouts ? price - Math.round((price * payouts.commission_percent) / 100) : 0;

  const loadVenues = useCallback(async (search: string) => {
    const c = await getSearchCenter();
    setCenter(c);
    const pos = c.coords;
    const res = await get<{ items: Venue[] }>('/venues', {
      lat: pos?.lat,
      lng: pos?.lng,
      radius_km: pos ? 30 : undefined,
      q: search,
      limit: 10,
    }).catch(() => ({ items: [] as Venue[] }));
    setVenues(res.items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const created = takeLastVenue();
      if (created) setVenue(created);
      loadVenues('');
      get<{ items: Team[] }>('/me/teams').then((r) => setTeams(r.items)).catch(() => undefined);
      get<{ organization: MyOrganization | null }>('/me/organization').then((r) => setOrg(r.organization)).catch(() => undefined);
    }, [loadVenues])
  );

  const submit = async () => {
    setError('');
    if (minutes === null) return setError("Choisis l'heure du match.");
    if (!venue) return setError('Choisis un terrain.');
    if (isTournament && title.trim().length < 3) return setError('Donne un nom au tournoi.');
    if (price > 0 && !payouts?.ready) return setError('Active les paiements dans ton espace pro pour fixer un prix.');
    const start = new Date(day);
    start.setMinutes(minutes);
    setLoading(true);
    try {
      const m = await post<Match>('/matches', {
        format,
        starts_at: start.toISOString(),
        venue_id: venue.id,
        level,
        max_players: players,
        home_team_id: pro ? null : teamId,
        visibility: isPrivate ? 'private' : 'public',
        description: description.trim() || null,
        price_cents: pro ? price : 0,
        ...(pro ? { organization_id: org!.id, kind: isTournament ? 'tournament' : 'match', title: title.trim() || null } : {}),
        ...(isTournament ? { duration_min: hours * 60 } : {}),
      });
      setMinutes(defaultTime(day));
      setDescription('');
      setTitle('');
      celebrate({ title: 'Match publié !', text: 'Les joueurs du coin peuvent s\'inscrire.', icon: 'megaphone' });
      router.push(`/match/${m.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Création impossible.');
    } finally {
      setLoading(false);
    }
  };

  // Récap toujours visible au-dessus du bouton Publier : ce qui est choisi, ce qui manque.
  const when = minutes === null ? null : new Date(day.getTime() + minutes * 60000);
  const recap = [
    FORMATS.find((f) => f.value === format)!.label,
    when ? `${dayLabel(when).toLowerCase()} ${timeLabel(when)}` : null,
    venue?.name ?? null,
  ].filter(Boolean).join(' · ');
  const missing = minutes === null ? "Choisis l'heure" : !venue ? 'Choisis le terrain' : null;

  return (
    <Screen
      top
      footer={
        <>
          <Text style={st.recap} numberOfLines={1}>
            {recap}
            {missing ? <Text style={{ color: colors.orange2 }}>{` · ${missing}`}</Text> : null}
          </Text>
          <ErrorText>{error}</ErrorText>
          <Button title={isTournament ? 'Publier le tournoi' : 'Publier le match'} icon="megaphone-outline" onPress={submit} loading={loading} />
        </>
      }
    >
      <PageHeader kicker="Coup d'envoi" title={isTournament ? 'Organise ton tournoi' : 'Organise ton match'} sub="Publie-le, les joueurs du coin s'inscrivent." />

      {org ? (
        <>
          <Label>Publier</Label>
          <Chips
            options={[{ value: 'org', label: org.name }, { value: 'me', label: 'En mon nom' }]}
            value={asOrg ? 'org' : 'me'}
            onChange={(v) => { setAsOrg(v === 'org'); setMaxPlayers(null); }}
          />
          {pro ? (
            <>
              <Chips
                options={[{ value: 'match', label: 'Match / créneau' }, { value: 'tournament', label: 'Tournoi' }]}
                value={tournament ? 'tournament' : 'match'}
                onChange={(v) => { setTournament(v === 'tournament'); setMaxPlayers(null); }}
              />
              <Field
                label={isTournament ? 'Nom du tournoi' : 'Nom (facultatif)'}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
                placeholder={isTournament ? 'Tournoi de la Toussaint' : 'Foot du jeudi soir'}
              />
            </>
          ) : null}
        </>
      ) : null}

      <Label>Format</Label>
      <Chips options={FORMATS.map((f) => ({ value: f.value, label: `${f.label} · ${f.short}` }))} value={format} onChange={(v) => { if (v) { setFormat(v); setMaxPlayers(null); } }} />

      <Label>Quand</Label>
      <WhenField
        day={day}
        minutes={minutes}
        onChange={(d, m) => {
          setDay(d);
          setMinutes(m);
        }}
      />

      <Label>Terrain</Label>
      {venue ? (
        <Card style={{ borderColor: colors.orange2, borderWidth: 2 }} onPress={() => setVenue(null)}>
          <Text style={{ ...font.extrabold, fontSize: 16 }}>{venue.name}</Text>
          <Text style={s.sub}>{venue.address}</Text>
          <Text style={{ color: colors.orange2, ...font.semibold }}>Changer de terrain</Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          <PlaceButton place={center.place} hasCoords={!!center.coords} onPress={() => setPlaceSheet(true)} />
          <Field label="Chercher un terrain" value={q} onChangeText={(t) => { setQ(t); loadVenues(t); }} placeholder="Nom ou adresse" />
          {venues.map((v) => (
            <Card key={v.id} onPress={() => setVenue(v)}>
              <Text style={{ ...font.bold }}>{v.name}</Text>
              <Text style={s.sub}>
                {surfaceLabel(v.surface)}
                {v.distance_km !== null ? ` · ${distanceLabel(v.distance_km)}` : ''} · {v.address}
              </Text>
            </Card>
          ))}
          {!venues.length ? <Text style={s.sub}>Aucun terrain trouvé ici pour l'instant.</Text> : null}
          <Button title="Ajouter un terrain" variant="ghost" icon="add" onPress={() => router.push('/venue/new')} />
        </View>
      )}

      <PlaceSheet
        visible={placeSheet}
        near={center.coords}
        onPick={async (p) => {
          await setSearchPlace(p);
          loadVenues(q);
        }}
        onClose={() => setPlaceSheet(false)}
      />

      <Label>Niveau visé</Label>
      <Chips options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={level} onChange={setLevel} allowEmpty />

      {isTournament ? (
        <>
          <Label>Durée</Label>
          <Chips options={TOURNAMENT_HOURS.map((h) => ({ value: h, label: `${h} h` }))} value={hours} onChange={(v) => v && setHours(v)} />
        </>
      ) : null}

      <Label>Nombre de joueurs</Label>
      <View style={s.row}>
        <Button title="−" variant="ghost" onPress={() => setMaxPlayers(Math.max(2, players - step))} style={{ width: 54 }} />
        <Text style={{ fontSize: 22, ...font.extrabold, minWidth: 50, textAlign: 'center' }}>{players}</Text>
        <Button title="+" variant="ghost" onPress={() => setMaxPlayers(Math.min(maxAllowed, players + step))} style={{ width: 54 }} />
      </View>
      {isTournament ? <Text style={s.sub}>Soit {Math.floor(players / teamSize)} équipes de {teamSize}.</Text> : null}

      {payouts?.enabled ? (
        <>
          <Label>Prix de la place</Label>
          <View style={s.row}>
            <Button title="−" variant="ghost" onPress={() => setPrice((p) => (p <= 100 ? 0 : p - 50))} style={{ width: 54 }} />
            <Text style={{ fontSize: 22, ...font.extrabold, minWidth: 90, textAlign: 'center', color: price ? colors.ink : colors.success }}>{price ? euros(price) : 'Gratuit'}</Text>
            <Button title="+" variant="ghost" onPress={() => setPrice((p) => Math.min(5000, p < 100 ? 100 : p + 50))} style={{ width: 54 }} />
          </View>
          {price > 0 ? (
            payouts.ready ? (
              <Text style={s.sub}>
                Chaque joueur paie {euros(price + payouts.fee_cents)} ({euros(payouts.fee_cents)} de frais de service). Tu reçois {euros(payout)} par place
                ({String(payouts.commission_percent).replace('.', ',')} % de commission Supercity), soit {euros(payout * players)} si c'est complet.
              </Text>
            ) : (
              <Card style={{ gap: 8, borderColor: colors.orange2, borderWidth: 2 }}>
                <Text style={{ ...font.bold, color: colors.ink }}>Active les paiements pour encaisser</Text>
                <Text style={s.sub}>Stripe vérifie ta structure et son RIB, une seule fois.</Text>
                <Button title="Activer les paiements" icon="card-outline" onPress={() => router.push('/pro')} />
              </Card>
            )
          ) : null}
        </>
      ) : null}

      {teams.length && !pro ? (
        <>
          <Label>Avec mon équipe</Label>
          <Chips options={teams.map((t) => ({ value: t.id, label: t.name }))} value={teamId} onChange={setTeamId} allowEmpty />
        </>
      ) : null}

      <Label>Visibilité</Label>
      <Chips
        options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Privé (sur invitation)' }]}
        value={isPrivate ? 'private' : 'public'}
        onChange={(v) => setIsPrivate(v === 'private')}
      />

      <Field label="Infos pour les joueurs" value={description} onChangeText={setDescription} placeholder="Chasubles fournies, rendez-vous 10 min avant…" multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />

      {!org ? (
        <Button title="Tu gères un five ou une asso ? Espace pro" variant="ghost" icon="briefcase-outline" onPress={() => router.push('/pro')} />
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  recap: { ...font.semibold, fontSize: 13, color: colors.ink },
});
