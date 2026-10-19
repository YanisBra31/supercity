// Recherche des matchs autour du joueur, en liste ou regroupés par terrain.
import { Bell, List, MailWarning, MapPin, PlusCircle, RefreshCw, Volleyball } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Place } from '../lib/address';
import { ApiError, BonusEvent, get, Match } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useBadge } from '../lib/badge';
import { distanceLabel, whenLabel } from '../lib/format';
import { Coords, getSearchCenter, setSearchPlace } from '../lib/location';
import { PlaceButton, PlaceSheet } from '../ui/AddressSearch';
import { TabPage } from '../ui/Layout';
import { MatchCard } from '../ui/MatchCard';
import { ActiveFilters, activeCount, DEFAULT_FILTERS, FilterButton, Filters, FilterSheet, whenRange, WhenBar } from '../ui/match/filters';
import { BonusBanner } from '../ui/streak';
import { Banner, ButtonLink, Card, Empty, ErrorText, IconButton, Loading, PageHeader } from '../ui/ui';

type View_ = 'list' | 'venues';
const FILTERS_KEY = 'supercity_match_filters';

function loadFilters(): Filters {
  try {
    const raw = sessionStorage.getItem(FILTERS_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<Filters>) } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

/** Les matchs regroupés par terrain, du plus proche au plus loin. */
function ByVenue({ matches }: { matches: Match[] }) {
  const byVenue = new Map<number, { name: string; city: string | null; distance: number | null; items: Match[] }>();
  for (const m of matches) {
    const e = byVenue.get(m.venue.id) ?? { name: m.venue.name, city: m.venue.city, distance: m.venue.distance_km, items: [] };
    e.items.push(m);
    byVenue.set(m.venue.id, e);
  }
  return (
    <>
      {[...byVenue.entries()].map(([id, v]) => (
        <Card key={id} className="venue-group">
          <div className="row">
            <MapPin size={18} aria-hidden style={{ color: 'var(--orange-2)' }} />
            <b className="grow ellipsis" style={{ fontSize: 16 }}>
              {v.name}
            </b>
            <span className="sub">{[v.city, distanceLabel(v.distance)].filter(Boolean).join(' · ')}</span>
          </div>
          <ul>
            {v.items.map((m) => (
              <li key={m.id}>
                <Link to={`/match/${m.id}`}>
                  <span>{whenLabel(m.starts_at)}</span>
                  <span className="sub">
                    {m.spots_left > 0 ? `${m.spots_left} place${m.spots_left > 1 ? 's' : ''}` : 'Complet'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}

export default function Matches() {
  const { user } = useAuth();
  const badge = useBadge();
  const [filters, setFiltersState] = useState<Filters>(loadFilters);
  const [view, setView] = useState<View_>('list');
  const [sheet, setSheet] = useState(false);
  const [placeSheet, setPlaceSheet] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [items, setItems] = useState<Match[] | null>(null);
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Les filtres tiennent le temps de la visite : on les retrouve en revenant d'une fiche de match.
  const setFilters = (f: Filters) => {
    setFiltersState(f);
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(f));
    } catch {
      /* stockage indisponible */
    }
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const { coords: pos, place: p } = await getSearchCenter();
      setCoords(pos);
      setPlace(p);
      const geo = pos ? { lat: pos.lat, lng: pos.lng, radius_km: filters.radius } : {};
      const res = await get<{ items: Match[] }>('/matches', {
        ...geo,
        ...whenRange(filters.when),
        format: filters.format ?? undefined,
        level: filters.level ?? undefined,
        spots: filters.onlyOpen ? 1 : undefined,
        sort: pos && filters.sort === 'date' ? 'date' : undefined,
        limit: 50,
      });
      setItems(res.items);
      get<{ items: BonusEvent[] }>('/bonus-events')
        .then((r) => setEvents(r.items.slice(0, 2)))
        .catch(() => setEvents([]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger les matchs.');
      setItems((prev) => prev ?? []);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Retour sur l'onglet après un moment ailleurs : la liste se met à jour.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const choosePlace = (p: Place | null) => {
    setSearchPlace(p);
    load();
  };

  const count = activeCount(filters, !!coords);
  const found = items ? `${items.length} match${items.length > 1 ? 's' : ''} à rejoindre` : 'Recherche des terrains…';

  return (
    <TabPage title="Matchs">
      <PageHeader
        kicker="Trouve ton match"
        title="Matchs"
        sub={found}
        right={
          <>
            <IconButton icon={RefreshCw} label="Actualiser" onClick={refresh} />
            <span className="only-phone">
              <IconButton icon={Bell} label="Notifications" badge={badge.unread} to="/notifications" />
            </span>
            <IconButton icon={view === 'list' ? MapPin : List} label={view === 'list' ? 'Voir par terrain' : 'Voir la liste'} onClick={() => setView(view === 'list' ? 'venues' : 'list')} dark />
          </>
        }
      />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="grow">
          <PlaceButton place={place} hasCoords={!!coords} onClick={() => setPlaceSheet(true)} />
        </div>
        <FilterButton count={count} onClick={() => setSheet(true)} />
      </div>
      <WhenBar value={filters.when} onChange={(when) => setFilters({ ...filters, when })} />
      <ActiveFilters f={filters} hasCoords={!!coords} onChange={setFilters} />
      {!coords && items ? (
        <p className="row sub" style={{ gap: 8, fontSize: 13 }}>
          <MapPin size={16} aria-hidden />
          Autorise la localisation ou choisis une ville pour voir les matchs autour.
        </p>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {user && !user.email_verified ? <Banner icon={MailWarning} title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." to="/verify" /> : null}
      {events.map((e) => (
        <BonusBanner key={e.id} event={e} />
      ))}

      {items === null || refreshing ? <Loading /> : null}
      {items && !items.length ? (
        <Empty
          icon={Volleyball}
          title="Aucun match pour ces filtres"
          text={count || filters.when !== 'all' ? 'Retire un filtre ou élargis la zone.' : 'Élargis la zone, ou organise le premier match du coin.'}
          action={
            <ButtonLink to="/create" icon={PlusCircle}>
              Organiser un match
            </ButtonLink>
          }
        />
      ) : null}
      {items?.length ? view === 'list' ? <div className="match-list">{items.map((m) => <MatchCard key={m.id} match={m} />)}</div> : <ByVenue matches={items} /> : null}

      <FilterSheet open={sheet} value={filters} hasCoords={!!coords} onApply={setFilters} onClose={() => setSheet(false)} />
      <PlaceSheet open={placeSheet} near={coords} onPick={choosePlace} onClose={() => setPlaceSheet(false)} />
    </TabPage>
  );
}
