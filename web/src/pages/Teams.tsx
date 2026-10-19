// Mes équipes : créer, rejoindre avec un code, ouvrir. Et les défis en cours.
import { KeyRound, Plus, Users, Zap } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, Challenge, Format, get, post, Team } from '../lib/api';
import { FORMATS, formatLabel } from '../lib/format';
import { ChallengeCard } from '../ui/ChallengeCard';
import { TabPage } from '../ui/Layout';
import { StreakBadge } from '../ui/streak';
import { Button, ButtonLink, Card, Chips, Empty, ErrorText, Field, IconButton, Kicker, Label, Loading, PageHeader, Pill, TeamCrest, useConfirm } from '../ui/ui';

export default function Teams() {
  const navigate = useNavigate();
  const { ask, dialog } = useConfirm();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [format, setFormat] = useState<Format | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenges, setChallenges] = useState<{ received: Challenge[]; sent: Challenge[] }>({ received: [], sent: [] });
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    get<{ received: Challenge[]; sent: Challenge[] }>('/me/challenges').then(setChallenges).catch(() => undefined);
    try {
      setTeams((await get<{ items: Team[] }>('/me/teams')).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger tes équipes.');
      setTeams([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const respond = async (c: Challenge, action: 'accept' | 'decline' | 'cancel') => {
    setError('');
    if (action !== 'accept' && !(await ask(action === 'decline' ? 'Refuser le défi ?' : 'Retirer le défi ?', action === 'decline' ? "L'autre équipe sera prévenue." : "L'équipe adverse ne le verra plus.", action === 'decline' ? 'Refuser' : 'Retirer'))) return;
    setBusy(c.id);
    try {
      const res = await post<Challenge>(`/challenges/${c.id}/${action}`);
      await load();
      if (action === 'accept' && res.match_id) navigate(`/match/${res.match_id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    } finally {
      setBusy(null);
    }
  };

  const all = [...challenges.received, ...challenges.sent];
  const live = all.filter((c) => c.status === 'pending');
  const past = all.filter((c) => c.status !== 'pending').slice(0, 4);

  const run = async (fn: () => Promise<Team>) => {
    setError('');
    setLoading(true);
    try {
      const t = await fn();
      navigate(`/team/${t.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : 'Action impossible.');
      setLoading(false);
    }
  };
  const cancel = () => {
    setMode('none');
    setError('');
  };

  return (
    <TabPage title="Équipes">
      <PageHeader
        kicker="Ton vestiaire"
        title="Équipes"
        sub="Monte ton équipe, invite tes potes avec un code."
        right={mode === 'none' ? <IconButton icon={Plus} label="Créer une équipe" onClick={() => setMode('create')} dark /> : undefined}
      />
      {mode === 'none' ? (
        <div className="row">
          <Button icon={KeyRound} variant="ghost" onClick={() => setMode('join')} className="grow">
            Rejoindre
          </Button>
          {teams?.some((t) => t.my_role === 'captain') ? (
            <ButtonLink to="/team/find" icon={Zap} variant="dark" className="grow">
              Défier
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      {mode === 'create' ? (
        <form
          className="card stack"
          style={{ gap: 14 }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            run(() => post<Team>('/teams', { name, city: city || null, usual_format: format }));
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Nouvelle équipe</h2>
          <Field label="Nom de l'équipe" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cartel Narvalo" maxLength={60} autoFocus />
          <Field label="Ville" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
          <Label>Format habituel</Label>
          <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={setFormat} allowEmpty />
          <ErrorText>{error}</ErrorText>
          <div className="row">
            <Button type="submit" loading={loading} disabled={!name.trim()} className="grow">
              Créer l'équipe
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'join' ? (
        <form
          className="card stack"
          style={{ gap: 14 }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            run(() => post<Team>('/teams/join', { invite_code: code }));
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Rejoindre une équipe</h2>
          <Field
            label="Code d'invitation"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
            maxLength={8}
            placeholder="8 caractères, donné par ton capitaine"
            autoComplete="off"
            autoFocus
            style={{ letterSpacing: code ? 3 : undefined, fontWeight: code ? 700 : undefined }}
          />
          <ErrorText>{error}</ErrorText>
          <div className="row">
            <Button type="submit" loading={loading} disabled={code.length < 4} className="grow">
              Rejoindre l'équipe
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'none' ? <ErrorText>{error}</ErrorText> : null}

      {live.length ? <Kicker>{`Défis en cours (${live.length})`}</Kicker> : null}
      {live.map((c) => (
        <ChallengeCard key={c.id} c={c} busy={busy === c.id} onAccept={() => respond(c, 'accept')} onDecline={() => respond(c, 'decline')} onCancel={() => respond(c, 'cancel')} />
      ))}

      {teams === null ? <Loading /> : null}
      {teams?.length ? <Kicker>Mes équipes</Kicker> : null}
      {teams?.length === 0 && mode === 'none' ? <Empty icon={Users} title="Pas encore d'équipe" text="Crée la tienne ou rejoins celle de tes potes avec leur code." /> : null}
      {teams?.map((t) => (
        <Card key={t.id} to={`/team/${t.id}`} className="row team-row">
          <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={52} />
          <span className="grow">
            <span className="row" style={{ gap: 8 }}>
              <b className="grow ellipsis team-row__name">{t.name}</b>
              <StreakBadge count={t.streak?.current} />
              {t.my_role === 'captain' ? <Pill text="Capitaine" /> : null}
            </span>
            <span className="sub ellipsis" style={{ display: 'block' }}>
              {t.members_count} joueur{t.members_count > 1 ? 's' : ''}
              {t.city ? ` · ${t.city}` : ''}
              {t.usual_format ? ` · ${formatLabel(t.usual_format)}` : ''}
            </span>
          </span>
        </Card>
      ))}
      {past.length ? <Kicker>Derniers défis</Kicker> : null}
      {past.map((c) => (
        <ChallengeCard key={c.id} c={c} />
      ))}
      {dialog}
    </TabPage>
  );
}
