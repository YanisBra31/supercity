// Organiser un match : format, date, terrain, puis options. Un espace pro publie aussi des tournois et fixe un prix.
import { Briefcase, Megaphone, Plus } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Place } from '../lib/address';
import { ApiError, Format, get, Match, MyOrganization, post, Team, Venue } from '../lib/api';
import { dayLabel, distanceLabel, FORMATS, LEVELS, surfaceLabel, timeLabel } from '../lib/format';
import { Coords, getSearchCenter, setSearchPlace } from '../lib/location';
import { euros } from '../lib/pay';
import { PlaceButton, PlaceSheet } from '../ui/AddressSearch';
import { celebrate } from '../ui/celebrate';
import { TabPage } from '../ui/Layout';
import { takeLastVenue } from '../ui/match/venueStore';
import { defaultTime, firstOpenDay, WhenField } from '../ui/match/WhenField';
import { Button, ButtonLink, Card, Chips, ErrorText, Field, Label, PageHeader, Select, TextArea } from '../ui/ui';

const TOURNAMENT_HOURS = [2, 3, 4, 6, 8, 10];
// Prix proposés : gratuit, puis de 1 € à 10 € par 50 centimes, puis par euro jusqu'à 50 €.
const PRICE_OPTIONS = [0, ...Array.from({ length: 19 }, (_, i) => 100 + i * 50), ...Array.from({ length: 40 }, (_, i) => 1100 + i * 100)].map((c) => ({
  value: c,
  label: c ? euros(c) : 'Gratuit',
}));

type Draft = {
  format: Format;
  day: number;
  minutes: number | null;
  venue: Venue | null;
  level: number | null;
  maxPlayers: number | null;
  price: number;
  asOrg: boolean;
  tournament: boolean;
  title: string;
  hours: number;
  teamId: number | null;
  isPrivate: boolean;
  description: string;
};
const fresh = (): Draft => {
  const d = firstOpenDay();
  return { format: 'city5', day: d.getTime(), minutes: defaultTime(d), venue: null, level: null, maxPlayers: null, price: 0, asOrg: true, tournament: false, title: '', hours: 4, teamId: null, isPrivate: false, description: '' };
};
// Brouillon gardé le temps de la visite : on le retrouve en revenant de « Ajouter un terrain ».
let saved: Draft | null = null;

export default function Create() {
  const navigate = useNavigate();
  const [d, setD] = useState<Draft>(() => {
    const base = saved && saved.day >= firstOpenDay().getTime() ? saved : fresh();
    const created = takeLastVenue();
    return created ? { ...base, venue: created } : base;
  });
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const [venues, setVenues] = useState<Venue[]>([]);
  const [q, setQ] = useState('');
  const [center, setCenter] = useState<{ coords: Coords | null; place: Place | null }>({ coords: null, place: null });
  const [placeSheet, setPlaceSheet] = useState(false);
  const [org, setOrg] = useState<MyOrganization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const search = useRef(0);

  useEffect(() => {
    saved = d;
  }, [d]);

  const day = new Date(d.day);
  const pro = !!org && d.asOrg;
  const isTournament = pro && d.tournament;
  const fmt = FORMATS.find((f) => f.value === d.format)!;
  const teamSize = fmt.players / 2;
  // Tournoi : on compte par équipes (8 équipes par défaut), jusqu'à 200 joueurs.
  const players = d.maxPlayers ?? (isTournament ? teamSize * 8 : fmt.players);
  const maxAllowed = isTournament ? 200 : 30;
  const step = isTournament ? teamSize : 1;
  const playerOptions = Array.from({ length: Math.floor(maxAllowed / step) }, (_, i) => (i + 1) * step)
    .filter((n) => n >= 2)
    .map((n) => ({
      value: n,
      label: `${n} joueurs${isTournament ? ` · ${n / teamSize} équipe${n / teamSize > 1 ? 's' : ''} de ${teamSize}` : n === fmt.players ? ` · format ${fmt.short}` : ''}`,
    }));
  const payouts = pro ? org!.payouts : null;
  const payout = payouts ? d.price - Math.round((d.price * payouts.commission_percent) / 100) : 0;

  const loadVenues = useCallback(async (text: string) => {
    const n = ++search.current;
    const c = await getSearchCenter();
    const pos = c.coords;
    const res = await get<{ items: Venue[] }>('/venues', { lat: pos?.lat, lng: pos?.lng, radius_km: pos ? 30 : undefined, q: text, limit: 10 }).catch(() => ({ items: [] as Venue[] }));
    // Seule la dernière recherche compte.
    if (n !== search.current) return;
    setCenter(c);
    setVenues(res.items);
  }, []);

  useEffect(() => {
    loadVenues('');
    get<{ items: Team[] }>('/me/teams')
      .then((r) => setTeams(r.items))
      .catch(() => undefined);
    get<{ organization: MyOrganization | null }>('/me/organization')
      .then((r) => setOrg(r.organization))
      .catch(() => undefined);
  }, [loadVenues]);

  useEffect(() => {
    const t = setTimeout(() => loadVenues(q), 250);
    return () => clearTimeout(t);
  }, [q, loadVenues]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (d.minutes === null) return setError("Choisis l'heure du match.");
    if (!d.venue) return setError('Choisis un terrain.');
    if (isTournament && d.title.trim().length < 3) return setError('Donne un nom au tournoi.');
    if (d.price > 0 && !payouts?.ready) return setError('Active les paiements dans ton espace pro pour fixer un prix.');
    const start = new Date(day);
    start.setMinutes(d.minutes);
    setLoading(true);
    try {
      const m = await post<Match>('/matches', {
        format: d.format,
        starts_at: start.toISOString(),
        venue_id: d.venue.id,
        level: d.level,
        max_players: players,
        home_team_id: pro ? null : d.teamId,
        visibility: d.isPrivate ? 'private' : 'public',
        description: d.description.trim() || null,
        price_cents: pro ? d.price : 0,
        ...(pro ? { organization_id: org!.id, kind: isTournament ? 'tournament' : 'match', title: d.title.trim() || null } : {}),
        ...(isTournament ? { duration_min: d.hours * 60 } : {}),
      });
      saved = null;
      celebrate({ title: 'Match publié !', text: "Les joueurs du coin peuvent s'inscrire." });
      navigate(`/match/${m.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.fields)[0] ?? err.message) : 'Création impossible.');
      setLoading(false);
    }
  };

  // Récap toujours visible au-dessus du bouton Publier : ce qui est choisi, ce qui manque.
  const when = d.minutes === null ? null : new Date(day.getTime() + d.minutes * 60000);
  const recap = [fmt.label, when ? `${dayLabel(when).toLowerCase()} ${timeLabel(when)}` : null, d.venue?.name ?? null].filter(Boolean).join(' · ');
  const missing = d.minutes === null ? "Choisis l'heure" : !d.venue ? 'Choisis le terrain' : null;

  return (
    <TabPage
      title="Organiser"
      footer={
        <>
          <p className="ellipsis" style={{ fontWeight: 600, fontSize: 13 }}>
            {recap}
            {missing ? <span style={{ color: 'var(--orange-2)' }}>{` · ${missing}`}</span> : null}
          </p>
          <ErrorText>{error}</ErrorText>
          <Button icon={Megaphone} loading={loading} onClick={() => submit()} block>
            {isTournament ? 'Publier le tournoi' : 'Publier le match'}
          </Button>
        </>
      }
    >
      <form className="stack create" style={{ gap: 14 }} onSubmit={submit}>
        <PageHeader kicker="Coup d'envoi" title={isTournament ? 'Organise ton tournoi' : 'Organise ton match'} sub="Publie-le, les joueurs du coin s'inscrivent." />

        {org ? (
          <>
            <Label>Publier</Label>
            <Chips
              label="Publier"
              options={[
                { value: 'org', label: org.name },
                { value: 'me', label: 'En mon nom' },
              ]}
              value={d.asOrg ? 'org' : 'me'}
              onChange={(v) => v && set({ asOrg: v === 'org', maxPlayers: null })}
            />
            {pro ? (
              <>
                <Chips
                  label="Type"
                  options={[
                    { value: 'match', label: 'Match / créneau' },
                    { value: 'tournament', label: 'Tournoi' },
                  ]}
                  value={d.tournament ? 'tournament' : 'match'}
                  onChange={(v) => v && set({ tournament: v === 'tournament', maxPlayers: null })}
                />
                <Field
                  label={isTournament ? 'Nom du tournoi' : 'Nom (facultatif)'}
                  value={d.title}
                  onChange={(e) => set({ title: e.target.value })}
                  maxLength={80}
                  placeholder={isTournament ? 'Tournoi de la Toussaint' : 'Foot du jeudi soir'}
                />
              </>
            ) : null}
          </>
        ) : null}

        <Label>Format</Label>
        <Chips label="Format" options={FORMATS.map((f) => ({ value: f.value, label: `${f.label} · ${f.short}` }))} value={d.format} onChange={(v) => v && set({ format: v, maxPlayers: null })} />

        <Label>Quand</Label>
        <WhenField day={day} minutes={d.minutes} onChange={(nd, m) => set({ day: nd.getTime(), minutes: m })} />

        <Label>Terrain</Label>
        {d.venue ? (
          <Card onClick={() => set({ venue: null })} className="venue-picked">
            <b style={{ display: 'block', fontSize: 16 }}>{d.venue.name}</b>
            <span className="sub" style={{ display: 'block' }}>
              {d.venue.address}
            </span>
            <span className="link" style={{ fontWeight: 600 }}>
              Changer de terrain
            </span>
          </Card>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <PlaceButton place={center.place} hasCoords={!!center.coords} onClick={() => setPlaceSheet(true)} />
            <Field label="Chercher un terrain" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou adresse" type="search" />
            <div className="venue-list">
              {venues.map((v) => (
                <Card key={v.id} onClick={() => set({ venue: v })}>
                  <b style={{ display: 'block' }}>{v.name}</b>
                  <span className="sub">
                    {surfaceLabel(v.surface)}
                    {v.distance_km !== null ? ` · ${distanceLabel(v.distance_km)}` : ''} · {v.address}
                  </span>
                </Card>
              ))}
            </div>
            {!venues.length ? <p className="sub">Aucun terrain trouvé ici pour l'instant.</p> : null}
            <ButtonLink to="/venue/new" variant="ghost" icon={Plus}>
              Ajouter un terrain
            </ButtonLink>
          </div>
        )}

        <Label>Niveau visé</Label>
        <Chips label="Niveau" options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={d.level} onChange={(v) => set({ level: v })} allowEmpty />

        {isTournament ? (
          <>
            <Label>Durée</Label>
            <Chips label="Durée" options={TOURNAMENT_HOURS.map((h) => ({ value: h, label: `${h} h` }))} value={d.hours} onChange={(v) => v && set({ hours: v })} />
          </>
        ) : null}

        <Select label={isTournament ? 'Nombre de joueurs (équipes complètes)' : 'Nombre de joueurs'} value={players} onChange={(v) => set({ maxPlayers: v })} options={playerOptions} />

        {payouts?.enabled ? (
          <>
            <Select label="Prix de la place" value={d.price} onChange={(v) => set({ price: v })} options={PRICE_OPTIONS} />
            {d.price > 0 ? (
              payouts.ready ? (
                <p className="sub">
                  Chaque joueur paie {euros(d.price + payouts.fee_cents)} ({euros(payouts.fee_cents)} de frais de service). Tu reçois {euros(payout)} par place (
                  {String(payouts.commission_percent).replace('.', ',')} % de commission Supercity), soit {euros(payout * players)} si c'est complet.
                </p>
              ) : (
                <section className="card stack" style={{ borderColor: 'var(--orange-2)', borderWidth: 2, gap: 8 }}>
                  <b>Active les paiements pour encaisser</b>
                  <p className="sub">Stripe vérifie ta structure et son RIB, une seule fois.</p>
                  <ButtonLink to="/pro" icon={Briefcase}>
                    Activer les paiements
                  </ButtonLink>
                </section>
              )
            ) : null}
          </>
        ) : null}

        {teams.length && !pro ? (
          <>
            <Label>Avec mon équipe</Label>
            <Chips label="Équipe" options={teams.map((t) => ({ value: t.id, label: t.name }))} value={d.teamId} onChange={(v) => set({ teamId: v })} allowEmpty />
          </>
        ) : null}

        <Label>Visibilité</Label>
        <Chips
          label="Visibilité"
          options={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Privé (sur invitation)' },
          ]}
          value={d.isPrivate ? 'private' : 'public'}
          onChange={(v) => v && set({ isPrivate: v === 'private' })}
        />

        <TextArea label="Infos pour les joueurs" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="Chasubles fournies, rendez-vous 10 min avant…" rows={3} maxLength={1000} />

        {!org ? (
          <ButtonLink to="/pro" variant="ghost" icon={Briefcase}>
            Tu gères un five ou une asso ? Espace pro
          </ButtonLink>
        ) : null}
      </form>

      <PlaceSheet
        open={placeSheet}
        near={center.coords}
        onPick={(p) => {
          setSearchPlace(p);
          loadVenues(q);
        }}
        onClose={() => setPlaceSheet(false)}
      />
    </TabPage>
  );
}
