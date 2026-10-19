// Lancer un défi à une équipe : sur un de nos matchs sans adversaire, ou sur un nouveau créneau.
import { MapPin, Plus, Shield, Zap } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError, Challenge, Format, get, Match, post, Team, Venue } from '../lib/api';
import { distanceLabel, FORMATS, formatLabel, surfaceLabel, whenLabel } from '../lib/format';
import { getPosition } from '../lib/location';
import { VersusBanner } from '../ui/ChallengeCard';
import { Page } from '../ui/Layout';
import { ButtonLink, Button, Chips, Empty, ErrorText, Field, Kicker, Label, Loading, TextArea } from '../ui/ui';

/** Choix du terrain : recherche parmi les terrains proches, ou ajout d'un nouveau. */
function VenuePicker({ value, onChange }: { value: Venue | null; onChange: (v: Venue | null) => void }) {
  const [q, setQ] = useState('');
  const [venues, setVenues] = useState<Venue[] | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const pos = await getPosition();
      const r = await get<{ items: Venue[] }>('/venues', { lat: pos?.lat, lng: pos?.lng, radius_km: pos ? 30 : undefined, q: q.trim(), limit: 8 }).catch(() => ({ items: [] as Venue[] }));
      if (alive) setVenues(r.items);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  if (value)
    return (
      <button type="button" className="card venue-pick is-on" onClick={() => onChange(null)}>
        <b>{value.name}</b>
        <span className="sub">{value.address}</span>
        <span className="link">Changer de terrain</span>
      </button>
    );
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Field label="Chercher un terrain" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou adresse" />
      {venues?.map((v) => (
        <button key={v.id} type="button" className="card venue-pick" onClick={() => onChange(v)}>
          <b className="row" style={{ gap: 6 }}>
            <MapPin size={16} aria-hidden style={{ color: 'var(--orange-2)' }} />
            {v.name}
          </b>
          <span className="sub">
            {surfaceLabel(v.surface)}
            {v.distance_km !== null ? ` · ${distanceLabel(v.distance_km)}` : ''} · {v.address}
          </span>
        </button>
      ))}
      {venues && !venues.length ? <p className="sub">Aucun terrain trouvé ici pour l'instant.</p> : null}
      <ButtonLink to="/venue/new" variant="ghost" icon={Plus}>
        Ajouter un terrain
      </ButtonLink>
    </div>
  );
}

/** Valeur pour <input type="datetime-local"> (heure locale). */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ChallengeNew() {
  const [params] = useSearchParams();
  const to = params.get('to') ?? '';
  const navigate = useNavigate();
  const [target, setTarget] = useState<Team | null>(null);
  const [mine, setMine] = useState<Team[] | null>(null);
  const [fromId, setFromId] = useState<number | null>(null);
  const [open, setOpen] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState<number | null>(params.get('match') ? Number(params.get('match')) : null);
  const [format, setFormat] = useState<Format>('city5');
  const [when, setWhen] = useState('');
  const [venue, setVenue] = useState<Venue | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!to) return setError('Équipe introuvable.');
    get<Team>(`/teams/${to}`).then(setTarget).catch(() => setError('Équipe introuvable.'));
    get<{ items: Team[] }>('/me/teams')
      .then((r) => {
        const caps = r.items.filter((t) => t.my_role === 'captain' && String(t.id) !== to);
        setMine(caps);
        if (caps.length) setFromId(caps[0].id);
      })
      .catch(() => setMine([]));
  }, [to]);

  // Nos matchs à venir sans adversaire : on peut y inviter l'équipe.
  useEffect(() => {
    if (!fromId) return;
    get<{ items: Match[] }>('/me/matches')
      .then((r) => setOpen(r.items.filter((m) => m.home_team?.id === fromId && !m.away_team && m.status !== 'cancelled' && m.status !== 'played')))
      .catch(() => setOpen([]));
  }, [fromId]);

  if (!target || mine === null)
    return (
      <Page title="Lancer un défi" back="/teams">
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );
  if (!mine.length)
    return (
      <Page title="Lancer un défi" back="/teams">
        <Empty
          icon={Shield}
          title="Il faut être capitaine"
          text="Seul le capitaine d'une équipe peut lancer un défi. Crée ton équipe dans l'onglet Équipes."
          action={<ButtonLink to="/teams">Mes équipes</ButtonLink>}
        />
      </Page>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!matchId && (!when || !venue)) return setError('Choisis le jour, l’heure et le terrain du match.');
    setLoading(true);
    try {
      await post<Challenge>('/challenges', {
        from_team_id: fromId,
        to_team_id: target.id,
        message: message.trim() || null,
        ...(matchId ? { match_id: matchId } : { format, starts_at: new Date(when).toISOString(), venue_id: venue!.id }),
      });
      navigate('/teams', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.fields)[0] ?? err.message) : 'Envoi du défi impossible.');
      setLoading(false);
    }
  };

  const from = mine.find((t) => t.id === fromId)!;
  return (
    <Page title={`Défier ${target.name}`} back={`/team/${target.id}`}>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <VersusBanner a={from} b={target} size={58} />

        {mine.length > 1 ? (
          <>
            <Label>Mon équipe</Label>
            <Chips
              options={mine.map((t) => ({ value: t.id, label: t.name }))}
              value={fromId}
              onChange={(v) => {
                if (v) {
                  setFromId(v);
                  setMatchId(null);
                }
              }}
            />
          </>
        ) : null}

        {open.length ? (
          <>
            <Kicker>Sur un de nos matchs</Kicker>
            <Chips options={open.map((m) => ({ value: m.id, label: `${whenLabel(m.starts_at)} · ${m.venue.name}` }))} value={matchId} onChange={setMatchId} allowEmpty />
          </>
        ) : null}

        {!matchId ? (
          <>
            <Kicker>{open.length ? 'Ou sur un nouveau créneau' : 'Le créneau proposé'}</Kicker>
            <Label>Format</Label>
            <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={(v) => v && setFormat(v)} />
            <Field label="Jour et heure" type="datetime-local" value={when} min={localInput(new Date())} step={900} onChange={(e) => setWhen(e.target.value)} />
            <Label>Terrain</Label>
            <VenuePicker value={venue} onChange={setVenue} />
          </>
        ) : null}

        <TextArea label="Un mot pour l'équipe adverse" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} placeholder="On vous attend de pied ferme 😤" />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" icon={Zap} loading={loading} block>
          Envoyer le défi
        </Button>
        <p className="sub" style={{ textAlign: 'center' }}>
          {matchId ? "S'ils acceptent, ils deviennent l'adversaire de ce match." : `S'ils acceptent, le match ${formatLabel(format)} est créé et les deux capitaines y sont inscrits.`}
        </p>
        <p className="sub" style={{ textAlign: 'center' }}>
          <Link to={`/team/${target.id}`} className="link">
            Voir la page de {target.name}
          </Link>
        </p>
      </form>
    </Page>
  );
}
