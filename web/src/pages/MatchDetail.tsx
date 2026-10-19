// Fiche d'un match : infos, équipes et score, joueurs, inscription et paiement.
import { Briefcase, CalendarPlus, CheckCircle2, ChevronRight, Clock, CreditCard, MapPin, MessagesSquare, Navigation, Search, Share2, Star, UserPlus, Volleyball, XCircle, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, del, get, JoinResult, Match, post, Rival, Team } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayLabel, distanceLabel, formatLabel, formatShort, levelLabel, orgKindLabel, POSITIONS, surfaceLabel, timeLabel, whenLabel } from '../lib/format';
import { shareMessage, webUrl } from '../lib/links';
import { euros, openStripe, returnUrl } from '../lib/pay';
import { celebrate } from '../ui/celebrate';
import { Page } from '../ui/Layout';
import { statusPill } from '../ui/MatchCard';
import { GradeBadge, RoleBadge } from '../ui/match/badges';
import { InviteSheet } from '../ui/match/InviteSheet';
import { ScoreCard } from '../ui/match/ScoreCard';
import { OrderSheet } from '../ui/OrderSheet';
import { BonusBanner, KingCard, StreakBadge } from '../ui/streak';
import { Avatar, Button, ButtonLink, Card, ErrorText, IconButton, Label, Loading, Pill, Success, TeamCrest, useConfirm, useToast } from '../ui/ui';

/** 90 min, 4 h, 2 h 30 */
function durationLabel(min: number): string {
  if (min < 120) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ''}`;
}

/** Fichier .ics pour ajouter le match à son agenda. */
function downloadIcs(m: Match) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(m.starts_at);
  const end = new Date(start.getTime() + m.duration_min * 60000);
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Supercity//FR',
    'BEGIN:VEVENT',
    `UID:match-${m.id}@supercity.fr`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${m.title ?? formatLabel(m.format)} · Supercity`)}`,
    `LOCATION:${esc(`${m.venue.name}, ${m.venue.address}`)}`,
    `URL:${webUrl(`match/${m.id}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `supercity-match-${m.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();
  const [m, setM] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Récapitulatif ouvert avant de payer : inscription payante ou place à régler.
  const [order, setOrder] = useState<'join' | 'pay' | null>(null);
  const [msg, setMsg] = useState('');
  const [inviting, setInviting] = useState(false);
  const moderator = user?.site_role === 'moderator' || user?.site_role === 'admin';
  const loaded = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      let match = await get<Match>(`/matches/${id}`);
      // Retour de la page de paiement Stripe (ou webhook en retard) : on vérifie le paiement.
      if (match.my_status === 'pending') {
        const after = await post<Match>(`/matches/${id}/pay/confirm`).catch(() => match);
        if (after.my_status === 'registered') {
          setMsg('Paiement reçu, ta place est confirmée !');
          celebrate({ title: 'Tu joues !', text: `${whenLabel(after.starts_at)} · ${after.venue.name}` });
        }
        match = after;
      }
      setM(match);
      setError('');
      setTeams((await get<{ items: Team[] }>('/me/teams')).items);
      if (match.home_team && !match.away_team) {
        get<{ items: Rival[] }>(`/matches/${id}/rivals`)
          .then((r) => setRivals(r.items))
          .catch(() => setRivals([]));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Match introuvable.');
    }
  }, [id]);

  useEffect(() => {
    if (loaded.current !== id) {
      loaded.current = id ?? null;
      setM(null);
    }
    load();
  }, [id, load]);

  // Retour sur l'onglet (après avoir payé dans un autre onglet, par exemple) : on recharge.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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

  if (!m)
    return (
      <Page title="Match" back="/">
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

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
        : "Ta place ira au premier joueur en liste d'attente.";
  const myTeamIds = new Set(teams.map((t) => t.id));
  const teamForMatch = [m.home_team, m.away_team].find((t) => t && myTeamIds.has(t.id));
  const seekOpponent = !closed && !!m.home_team && !m.away_team && teams.some((t) => t.id === m.home_team!.id && t.my_role === 'captain');
  const registered = m.players?.filter((p) => p.status === 'registered') ?? [];
  const waiting = m.players?.filter((p) => p.status === 'waitlist') ?? [];
  const start = new Date(m.starts_at);

  const share = async () => {
    const r = await shareMessage(`${m.title ?? formatLabel(m.format)} ${whenLabel(m.starts_at)} à ${m.venue.name}. Viens jouer sur Supercity : ${webUrl(`match/${m.id}`)}`);
    if (r === 'copied') show('Lien du match copié, colle-le à tes potes.');
    if (r === 'failed') show('Copie impossible : ' + webUrl(`match/${m.id}`));
  };
  // Paiement de la place : on part sur Stripe, qui ramène sur cette fiche (vérifiée au chargement).
  const pay = async (checkoutUrl: string | null | undefined, current: Match): Promise<Match> => {
    if (!checkoutUrl) return current;
    return openStripe(checkoutUrl);
  };
  const join = () =>
    act(async () => {
      const r = await post<JoinResult>(`/matches/${m.id}/join`, { ...(teamForMatch ? { team_id: teamForMatch.id } : {}), return_url: returnUrl(`match/${m.id}`) });
      const after = await pay(r.checkout_url, r);
      if (after.my_status === 'registered') celebrate({ title: 'Tu joues !', text: `${whenLabel(after.starts_at)} · ${after.venue.name}` });
      if (after.my_status === 'waitlist') setMsg("Tu es en liste d'attente : on te prévient si une place se libère.");
      return after;
    });
  const payPlace = () => act(async () => pay((await post<{ checkout_url: string }>(`/matches/${m.id}/pay`, { return_url: returnUrl(`match/${m.id}`) })).checkout_url, m));
  const leave = async () => {
    if (await ask('Te désister ?', leaveText, 'Me désister'))
      act(async () => {
        const r = await del<JoinResult>(`/matches/${m.id}/join`);
        if (r.refunded_cents) setMsg(`Remboursement de ${euros(r.refunded_cents)} en route vers ta carte.`);
        return r;
      });
  };
  const cancelMatch = async () => {
    if (await ask('Annuler le match ?', m.price_cents > 0 ? 'Les joueurs inscrits seront prévenus et remboursés en entier.' : 'Les joueurs inscrits verront le match comme annulé.', 'Annuler le match'))
      act(() => post<Match>(`/matches/${m.id}/cancel`));
  };

  // Action principale, collée en bas : s'inscrire, payer sa place, noter les joueurs, ou l'état du match.
  const primary =
    m.ratings_left != null ? (
      <ButtonLink to={`/rate/${m.id}`} icon={Star} variant={m.ratings_left ? 'primary' : 'ghost'} className="grow">
        {m.ratings_left ? `Noter les joueurs · ${m.ratings_left}` : 'Revoir mes notes'}
      </ButtonLink>
    ) : closed ? (
      <p className="md__state grow">{cancelled ? 'Ce match a été annulé.' : 'Match terminé.'}</p>
    ) : m.my_status === 'pending' ? (
      <Button icon={CreditCard} loading={busy} className="grow" onClick={() => setOrder('pay')}>
        {`Payer ma place · ${euros(total)}`}
      </Button>
    ) : inMatch ? (
      <p className="md__state grow">
        {m.my_status === 'waitlist' ? <Clock size={20} aria-hidden /> : <CheckCircle2 size={20} aria-hidden />}
        {m.my_status === 'waitlist' ? "Tu es en liste d'attente" : 'Tu es inscrit, à toi de jouer !'}
      </p>
    ) : (
      <Button icon={Volleyball} loading={busy} className="grow" onClick={() => (paid && !m.my_paid && m.spots_left > 0 ? setOrder('join') : join())}>
        {m.spots_left > 0 ? (paid && !m.my_paid ? `Je joue · ${euros(total)}` : 'Je joue') : "Liste d'attente"}
      </Button>
    );

  const footer = (
    <>
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      {!closed && !inMatch && paid && m.spots_left === 0 ? (
        <Link to="/help?q=attente" className="link" style={{ fontSize: 13 }}>
          Comment marche la liste d'attente ?
        </Link>
      ) : null}
      <div className="row">
        {primary}
        <IconButton icon={Share2} label="Partager le match" onClick={share} />
      </div>
    </>
  );

  return (
    <Page title={m.title ?? m.venue.name} back="/" footer={footer}>
      <section className={`hero md__hero${cancelled ? ' hero--grey' : ''}`}>
        <p className="kicker" style={{ color: 'var(--chalk)', opacity: 0.9 }}>
          {`${m.kind === 'tournament' ? 'Tournoi' : formatLabel(m.format)} · ${formatShort(m.format)}`}
        </p>
        {m.title ? <h2 className="md__title">{m.title}</h2> : null}
        {/* L'heure du coup d'envoi en très gros : c'est ce qu'on cherche en premier. */}
        <p className="md__day">{dayLabel(start)}</p>
        <p className="md__time">{timeLabel(start)}</p>
        <p className="md__sub">{[durationLabel(m.duration_min), levelLabel(m.level), `organisé par ${m.organization?.name ?? m.organizer.display_name}`].join(' · ')}</p>
        {cancelled ? (
          <span className="md__cancelled">
            <XCircle size={18} aria-hidden /> Match annulé
          </span>
        ) : (
          <div style={{ marginTop: 8 }}>{statusPill(m)}</div>
        )}
        {cancelled ? null : (
          <div className="stack" style={{ marginTop: 12, gap: 6 }}>
            <div className="md__fill">
              <i style={{ width: `${Math.min(1, m.players_count / m.max_players) * 100}%` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {m.players_count}/{m.max_players} joueurs
              {m.spots_left > 0 ? ` · ${m.spots_left} place${m.spots_left > 1 ? 's' : ''} libre${m.spots_left > 1 ? 's' : ''}` : ''}
            </span>
          </div>
        )}
      </section>

      {m.chat_unread != null || (!closed && (inMatch || m.is_organizer)) ? (
        <div className="md__actions">
          {m.chat_unread != null ? (
            <ButtonLink to={`/chat/match/${m.id}`} icon={MessagesSquare} variant={m.chat_unread ? 'primary' : 'dark'}>
              {m.chat_unread ? `Discussion du match · ${m.chat_unread} nouveau${m.chat_unread > 1 ? 'x' : ''}` : 'Discussion du match'}
            </ButtonLink>
          ) : null}
          {!closed && (inMatch || m.is_organizer) ? (
            <Button icon={UserPlus} variant="ghost" onClick={() => setInviting(true)}>
              Inviter des amis
            </Button>
          ) : null}
          {!closed && inMatch && m.my_status !== 'pending' ? (
            <Button icon={CalendarPlus} variant="ghost" onClick={() => downloadIcs(m)}>
              Ajouter à mon agenda
            </Button>
          ) : null}
        </div>
      ) : null}

      {m.home_team || m.away_team ? (
        <section className="hero hero--night md__versus">
          <Link to={m.home_team ? `/team/${m.home_team.id}` : '#'} className="md__team" onClick={(e) => !m.home_team && e.preventDefault()}>
            {m.home_team ? <TeamCrest name={m.home_team.name} logo={m.home_team.logo_url} primary={m.home_team.color_primary} secondary={m.home_team.color_secondary} size={52} /> : <Avatar name="?" size={52} />}
            <b>{m.home_team?.name ?? 'Joueurs libres'}</b>
            <StreakBadge count={m.home_team?.streak} onDark />
          </Link>
          {m.score?.home != null && m.score.away != null ? (
            <div className="md__score">
              <b>
                {m.score.home} - {m.score.away}
              </b>
              {m.score.status !== 'confirmed' ? <span>{m.score.status === 'disputed' ? 'CONTESTÉ' : 'À CONFIRMER'}</span> : null}
            </div>
          ) : (
            <b className="md__vs">VS</b>
          )}
          <Link to={m.away_team ? `/team/${m.away_team.id}` : '#'} className="md__team" onClick={(e) => !m.away_team && e.preventDefault()}>
            {m.away_team ? <TeamCrest name={m.away_team.name} logo={m.away_team.logo_url} primary={m.away_team.color_primary} secondary={m.away_team.color_secondary} size={52} /> : <Avatar name="?" size={52} tone="nuit" />}
            <b>{m.away_team?.name ?? 'Adversaire à trouver'}</b>
            <StreakBadge count={m.away_team?.streak} onDark />
          </Link>
        </section>
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
        <section className="card stack" style={{ borderColor: 'var(--orange-1)', borderWidth: 2 }}>
          <p className="kicker">Cherche adversaire</p>
          {rivals.length ? (
            <>
              <p>Ces équipes jouent sur ce terrain à quelques heures près. Défie-les !</p>
              {rivals.map((r) => (
                <div key={r.team.id} className="row">
                  <TeamCrest name={r.team.name} logo={r.team.logo_url} primary={r.team.color_primary} secondary={r.team.color_secondary} size={40} />
                  <span className="grow">
                    <b style={{ display: 'block' }}>{r.team.name}</b>
                    <span className="sub">Joue ici à {timeLabel(new Date(r.starts_at))}</span>
                  </span>
                  <ButtonLink to={`/challenge/new?to=${r.team.id}&match=${m.id}`} icon={Zap} small>
                    Défier
                  </ButtonLink>
                </div>
              ))}
            </>
          ) : (
            <p>Ton équipe n'a pas encore d'adversaire pour ce match.</p>
          )}
          <ButtonLink to={`/team/find?match=${m.id}`} variant="ghost" icon={Search}>
            Chercher une équipe
          </ButtonLink>
        </section>
      ) : null}

      <section className="card stack" style={{ gap: 4 }}>
        <div className="row">
          <MapPin size={18} aria-hidden style={{ color: 'var(--orange-2)' }} />
          <b className="grow" style={{ fontSize: 16 }}>
            {m.venue.name}
          </b>
          <a className="btn btn--ghost btn--small" href={`https://www.google.com/maps/dir/?api=1&destination=${m.venue.lat},${m.venue.lng}`} target="_blank" rel="noreferrer">
            <Navigation size={16} aria-hidden />
            <span className="btn__label">Itinéraire</span>
          </a>
        </div>
        <p className="sub">{m.venue.address}</p>
        <p className="sub">
          {surfaceLabel(m.venue.surface)}
          {m.venue.covered ? ' · couvert' : ''}
          {m.venue.distance_km !== null ? ` · ${distanceLabel(m.venue.distance_km)}` : ''}
        </p>
      </section>

      <KingCard king={m.venue.king} />

      {m.organization ? (
        <Card to={`/org/${m.organization.id}`} className="row" style={{ display: 'flex', gap: 12 }}>
          <Briefcase size={22} aria-hidden style={{ color: 'var(--orange-2)' }} />
          <span className="grow">
            <b style={{ display: 'block', fontSize: 16 }}>{m.organization.name}</b>
            <span className="sub">
              {orgKindLabel(m.organization.kind)}
              {m.organization.city ? ` · ${m.organization.city}` : ''} · voir ses autres créneaux
            </span>
          </span>
          <ChevronRight size={18} aria-hidden style={{ color: 'var(--dim)' }} />
        </Card>
      ) : null}

      {m.price_cents > 0 ? (
        <section className="card row" style={{ display: 'flex', gap: 12 }}>
          <CreditCard size={22} aria-hidden style={{ color: 'var(--orange-2)', flexShrink: 0 }} />
          <span className="grow">
            <b style={{ display: 'block', fontSize: 16 }}>{euros(m.price_cents)} la place</b>
            <span className="sub">
              {m.is_organizer
                ? `Chaque joueur paie ${euros(total)}, frais de service compris. Tu reçois ${euros(m.payout_cents ?? m.price_cents)} par joueur, commission Supercity déduite.`
                : `+ ${euros(m.fee_cents)} de frais de service. Remboursé si tu te désistes plus de 24 h avant.`}
            </span>
          </span>
          {m.my_paid ? <Pill text="Payé" tone="green" /> : null}
        </section>
      ) : null}

      {m.my_status === 'pending' && !closed ? (
        <section className="card stack" style={{ borderColor: 'var(--orange-2)', borderWidth: 2, gap: 6 }}>
          <b>Ta place est réservée jusqu'à {m.my_hold_until ? timeLabel(new Date(m.my_hold_until)) : 'bientôt'}</b>
          <p className="sub">Paie-la pour confirmer ton inscription, sinon elle passera au joueur suivant.</p>
        </section>
      ) : null}

      {m.description ? <p style={{ whiteSpace: 'pre-wrap' }}>{m.description}</p> : null}

      <section className="stack" style={{ gap: 4 }}>
        <Label>
          Joueurs {m.players_count}/{m.max_players}
        </Label>
        {registered.map((p) => (
          <Link key={p.id} to={`/user/${p.id}`} className="md__player">
            <Avatar name={p.display_name} uri={p.avatar_url} size={38} tone={p.accent} />
            <span className="grow">
              <b className="ellipsis" style={{ display: 'block' }}>
                {p.display_name}
              </b>
              <span className="row" style={{ gap: 6 }}>
                <GradeBadge grade={p.grade} />
                <RoleBadge role={p.site_role} />
              </span>
            </span>
            {p.position ? <Pill text={POSITIONS.find((x) => x.value === p.position)?.label ?? ''} tone="grey" /> : null}
          </Link>
        ))}
        {!registered.length ? <p className="sub">Personne pour l'instant. Lance-toi !</p> : null}
        {waiting.length ? <Label>Liste d'attente</Label> : null}
        {waiting.map((p, i) => (
          <Link key={p.id} to={`/user/${p.id}`} className="sub link" style={{ fontWeight: 500 }}>
            {i + 1}. {p.display_name}
          </Link>
        ))}
      </section>

      {!closed && inMatch && m.my_status !== 'pending' ? (
        <Button variant="ghost" loading={busy} onClick={leave}>
          Me désister
        </Button>
      ) : null}
      {m.is_organizer && !closed ? (
        <Button variant="danger" onClick={cancelMatch}>
          Annuler le match
        </Button>
      ) : null}

      <InviteSheet
        matchId={m.id}
        open={inviting}
        onClose={() => setInviting(false)}
        onSent={(n) => show(n ? `${n} ami${n > 1 ? 's' : ''} invité${n > 1 ? 's' : ''} !` : 'Ces amis étaient déjà invités.')}
      />
      <OrderSheet
        open={order !== null}
        title="Ta place pour ce match"
        lines={[
          { label: 'Match', value: `${m.title ?? formatLabel(m.format)} · ${formatShort(m.format)}` },
          { label: 'Quand', value: whenLabel(m.starts_at) },
          { label: 'Où', value: m.venue.name },
          { label: 'Place', value: euros(m.price_cents) },
          { label: 'Frais de service', value: euros(m.fee_cents) },
        ]}
        total={{ label: 'Total TTC', value: euros(total) }}
        notes={['Remboursé si tu annules plus de 24 h avant le match, hors frais de service. Paiement sécurisé par Stripe.']}
        help="annuler"
        confirm={`Confirmer et payer · ${euros(total)}`}
        busy={busy}
        onClose={() => setOrder(null)}
        onConfirm={() => {
          const next = order === 'join' ? join : payPlace;
          setOrder(null);
          next();
        }}
      />
      {dialog}
      {toast}
    </Page>
  );
}
