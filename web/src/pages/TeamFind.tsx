// Trouver une équipe à défier.
import { Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { get, Team } from '../lib/api';
import { Page } from '../ui/Layout';
import { StreakBadge } from '../ui/streak';
import { ButtonLink, Empty, Field, Loading, Pill, TeamCrest } from '../ui/ui';

export default function TeamFind() {
  const [params] = useSearchParams();
  const match = params.get('match');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Team[] | null>(null);

  // Recherche au fil de la frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      get<{ items: Team[] }>('/teams', { q: q.trim(), limit: 30 })
        .then((r) => setItems(r.items.filter((x) => !x.my_role)))
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Page title="Défier une équipe" back="/teams">
      <Field label="Chercher une équipe" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l'équipe" autoFocus />
      {items === null ? <Loading /> : null}
      {items?.length === 0 ? <Empty icon={Search} title="Aucune équipe trouvée" text="Essaie un autre nom." /> : null}
      {items?.map((t) => (
        <div key={t.id} className="card row team-row">
          <Link to={`/team/${t.id}`} className="row grow" style={{ gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={48} />
            <span className="grow">
              <span className="row" style={{ gap: 8 }}>
                <b className="ellipsis team-row__name">{t.name}</b>
                <StreakBadge count={t.streak?.current} />
              </span>
              <span className="sub" style={{ display: 'block' }}>
                {t.members_count} joueur{t.members_count > 1 ? 's' : ''}
                {t.city ? ` · ${t.city}` : ''}
              </span>
              {t.recruiting ? <Pill text="Recrute" tone="green" /> : null}
            </span>
          </Link>
          <ButtonLink to={`/challenge/new?to=${t.id}${match ? `&match=${match}` : ''}`} icon={Zap} small>
            Défier
          </ButtonLink>
        </div>
      ))}
    </Page>
  );
}
