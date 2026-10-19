// Page publique d'un espace pro : présentation et matchs ou tournois à venir.
import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError, get, Match, OrgSummary } from '../lib/api';
import { orgKindLabel } from '../lib/format';
import { Page } from '../ui/Layout';
import { MatchCard } from '../ui/MatchCard';
import { Hero } from '../ui/hero';
import { Empty, ErrorText, Kicker, Loading } from '../ui/ui';

export default function Org() {
  const { id } = useParams();
  const [org, setOrg] = useState<(OrgSummary & { matches: Match[] }) | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrg(null);
    get<OrgSummary & { matches: Match[] }>(`/organizations/${id}`)
      .then(setOrg)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Page introuvable.'));
  }, [id]);

  return (
    <Page title={org?.name ?? 'Espace pro'}>
      {!org ? (
        error ? <ErrorText>{error}</ErrorText> : <Loading />
      ) : (
        <>
          <Hero kicker={`Pro · ${orgKindLabel(org.kind)}`} title={org.name} sub={org.city ?? undefined} />
          {org.description ? <p style={{ whiteSpace: 'pre-line' }}>{org.description}</p> : null}
          <Kicker>À venir</Kicker>
          {org.matches.length ? (
            org.matches.map((m) => <MatchCard key={m.id} match={m} />)
          ) : (
            <Empty icon={CalendarDays} title="Rien de prévu pour l'instant" text="Reviens bientôt pour les prochains créneaux et tournois." />
          )}
        </>
      )}
    </Page>
  );
}
