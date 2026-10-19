// Détail d'une équipe : code d'invitation, résultats, joueurs, départ.
import { Copy, LogOut, MessagesSquare, Palette, Share2, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError, del, get, Match, post, Team } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayLabel, formatLabel, levelLabel, POSITIONS } from '../lib/format';
import { shareMessage, webUrl } from '../lib/links';
import { GradeBadge, RoleBadge } from '../ui/grade';
import { Page } from '../ui/Layout';
import { StreakBadge, StreakCard } from '../ui/streak';
import { Avatar, Button, ButtonLink, ErrorText, Kicker, Loading, Pill, readableOn, TeamCrest, useConfirm, useToast } from '../ui/ui';

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Match[]>([]);

  const load = useCallback(async () => {
    try {
      setTeam(await get<Team>(`/teams/${id}`));
      get<{ items: Match[] }>(`/teams/${id}/results`).then((r) => setResults(r.items)).catch(() => setResults([]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Équipe introuvable.');
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      if (after) after();
      else load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    }
  };

  if (!team)
    return (
      <Page title="Équipe" back="/teams">
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

  const captain = team.my_role === 'captain';
  const ink = readableOn(team.color_primary);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(team.invite_code!);
      show('Code copié.');
    } catch {
      show('Copie impossible : sélectionne le code à la main.');
    }
  };

  return (
    <Page title={team.name} back="/teams">
      <section className="hero" style={{ background: `linear-gradient(135deg, ${team.color_primary}, ${team.color_primary} 50%, ${team.color_secondary})`, color: ink }}>
        <p className="kicker" style={{ color: ink, opacity: 0.85 }}>
          {captain ? 'Tu es capitaine' : team.my_role ? 'Ton équipe' : 'Équipe'}
        </p>
        <div className="row" style={{ gap: 14, marginTop: 8 }}>
          <TeamCrest name={team.name} logo={team.logo_url} primary={team.color_secondary} secondary={team.color_primary} size={76} />
          <div className="grow stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 800 }}>{team.name}</h2>
            <StreakBadge count={team.streak?.current} size="md" onDark />
            <p style={{ fontSize: 13, opacity: 0.9 }}>
              {[`${team.members_count} joueur${team.members_count > 1 ? 's' : ''}`, team.city, team.usual_format ? formatLabel(team.usual_format) : null, team.founded_year ? `depuis ${team.founded_year}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        {team.description ? <p style={{ fontSize: 14, lineHeight: 1.45, marginTop: 10, fontWeight: 500 }}>{team.description}</p> : null}
        {team.recruiting ? (
          <div style={{ marginTop: 10 }}>
            <Pill text="On recrute !" tone="dark" />
          </div>
        ) : null}
      </section>

      <div className="team-actions">
        {!team.my_role ? (
          <ButtonLink to={`/challenge/new?to=${team.id}`} icon={Zap}>
            Défier cette équipe
          </ButtonLink>
        ) : null}
        {team.my_role ? (
          <ButtonLink to={`/chat/team/${team.id}`} icon={MessagesSquare} variant={team.chat_unread ? 'primary' : 'dark'}>
            {team.chat_unread ? `Discussion d'équipe · ${team.chat_unread}` : "Discussion d'équipe"}
          </ButtonLink>
        ) : null}
        {captain ? (
          <ButtonLink to={`/team/edit/${team.id}`} icon={Palette} variant="dark">
            Personnaliser l'équipe
          </ButtonLink>
        ) : null}
      </div>

      <StreakCard streak={team.streak} />

      {results.length ? (
        <section className="stack" style={{ gap: 8 }}>
          <Kicker>Derniers résultats</Kicker>
          {results.slice(0, 5).map((r) => {
            const home = r.home_team?.id === team.id;
            const opp = home ? r.away_team : r.home_team;
            const mine = home ? r.score?.home : r.score?.away;
            const theirs = home ? r.score?.away : r.score?.home;
            const res = r.score?.winner_team_id === team.id ? 'V' : r.score?.winner_team_id === 0 ? 'N' : 'D';
            return (
              <Link key={r.id} to={`/match/${r.id}`} className="card row result-row">
                <span className={`result-row__res result-row__res--${res}`} aria-label={{ V: 'Victoire', N: 'Nul', D: 'Défaite' }[res]}>
                  {res}
                </span>
                <span className="grow">
                  <b>contre {opp?.name ?? '?'}</b>
                  <span className="sub ellipsis" style={{ display: 'block' }}>
                    {dayLabel(new Date(r.starts_at))} · {r.venue.name}
                  </span>
                </span>
                <b className="result-row__score">
                  {mine} - {theirs}
                </b>
              </Link>
            );
          })}
        </section>
      ) : null}

      {team.invite_code ? (
        <section className="hero hero--night stack invite" style={{ gap: 10 }}>
          <p className="kicker" style={{ color: 'var(--orange-1)' }}>
            Code d'invitation
          </p>
          <button type="button" className="invite__code" onClick={copy} title="Copier le code">
            {team.invite_code}
            <Copy size={20} aria-hidden />
          </button>
          <p style={{ opacity: 0.8, fontSize: 14 }}>Donne ce code à tes potes : ils le tapent dans Équipes, puis « Rejoindre ».</p>
          <Button
            icon={Share2}
            onClick={async () => {
              const r = await shareMessage(`Rejoins ${team.name} sur Supercity avec le code ${team.invite_code} : ${webUrl('teams')}`);
              if (r === 'copied') show('Invitation copiée, colle-la à tes potes.');
            }}
          >
            Inviter des joueurs
          </Button>
          {captain ? (
            <button
              type="button"
              className="link"
              style={{ color: 'var(--chalk)', opacity: 0.75 }}
              onClick={async () => {
                if (await ask('Générer un nouveau code ?', "L'ancien code ne marchera plus.", 'Nouveau code', false)) act(() => post(`/teams/${team.id}/invite-code`));
              }}
            >
              Générer un nouveau code
            </button>
          ) : null}
        </section>
      ) : null}

      <Kicker>{`Effectif (${team.members?.length ?? team.members_count})`}</Kicker>
      {team.members?.map((m) => (
        <div key={m.id} className="card stack member" style={{ gap: 8 }}>
          <Link to={`/user/${m.id}`} className="row member__link">
            <Avatar name={m.display_name} uri={m.avatar_url} size={40} tone={m.accent} />
            <span className="grow">
              <b>
                {m.display_name}
                {m.shirt_number != null ? <span style={{ color: 'var(--orange-2)' }}>{`  #${m.shirt_number}`}</span> : null}
              </b>
              <span className="sub" style={{ display: 'block' }}>
                {[POSITIONS.find((p) => p.value === m.position)?.label, m.level ? levelLabel(m.level) : null].filter(Boolean).join(' · ') || 'Profil à compléter'}
              </span>
            </span>
            <GradeBadge grade={m.grade} />
            <RoleBadge role={m.site_role} />
            {m.role === 'captain' ? <Pill text="Capitaine" /> : null}
          </Link>
          {captain && m.id !== user?.id ? (
            <div className="row" style={{ gap: 16, paddingLeft: 50 }}>
              <button
                type="button"
                className="link"
                onClick={async () => {
                  if (await ask('Passer le brassard ?', `${m.display_name} deviendra capitaine.`, 'Nommer capitaine', false)) act(() => post(`/teams/${team.id}/captain`, { user_id: m.id }));
                }}
              >
                Nommer capitaine
              </button>
              <button
                type="button"
                className="link"
                style={{ color: 'var(--danger)' }}
                onClick={async () => {
                  if (await ask('Retirer ce joueur ?', `${m.display_name} ne fera plus partie de l'équipe.`, 'Retirer')) act(() => del(`/teams/${team.id}/members/${m.id}`));
                }}
              >
                Retirer
              </button>
            </div>
          ) : null}
        </div>
      ))}

      <ErrorText>{error}</ErrorText>
      {team.my_role ? (
        <Button
          icon={LogOut}
          variant="danger"
          onClick={async () => {
            const alone = team.members_count === 1;
            if (await ask("Quitter l'équipe ?", alone ? "Tu es le dernier joueur : l'équipe sera supprimée." : 'Tu pourras revenir avec le code.', 'Quitter'))
              act(() => del(`/teams/${team.id}/members/me`), () => navigate('/teams', { replace: true }));
          }}
        >
          Quitter l'équipe
        </Button>
      ) : null}
      {dialog}
      {toast}
    </Page>
  );
}
