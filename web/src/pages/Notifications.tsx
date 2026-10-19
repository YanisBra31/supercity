// Centre de notifications : tout ce qui concerne le joueur, du plus récent au plus ancien.
// Ouvrir la page marque tout comme lu ; les nouveautés restent surlignées le temps de la visite.
import { AlarmClock, ArrowUpCircle, Bell, CalendarX, CheckCircle2, ClipboardList, Flame, MailOpen, UserPlus, Users, Volleyball, XCircle, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, Badge, get, InboxItem, post } from '../lib/api';
import { setBadge } from '../lib/badge';
import { timeAgo } from '../lib/format';
import { TabPage } from '../ui/Layout';
import { Avatar, ButtonLink, Empty, ErrorText, Icon, Kicker, Loading, PageHeader } from '../ui/ui';

const ICONS: Record<string, Icon> = {
  score: ClipboardList,
  challenge: Zap,
  challenge_accepted: CheckCircle2,
  challenge_declined: XCircle,
  waitlist: ArrowUpCircle,
  cancelled: CalendarX,
  streak: Flame,
  friend_request: UserPlus,
  friend_accepted: Users,
  friend_match: Volleyball,
  invite: MailOpen,
  reminder: AlarmClock,
};

/** Adresse de la notification dans l'appli (« /match/12 »), ou null si elle mène ailleurs. */
function inApp(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin !== window.location.origin) return url;
    return (u.pathname.replace(/^\/app(?=\/|$)/, '') || '/') + u.search;
  } catch {
    return url;
  }
}

function Row({ n }: { n: InboxItem }) {
  const I = ICONS[n.kind] ?? Bell;
  const inner = (
    <>
      {n.actor ? (
        <span style={{ position: 'relative' }}>
          <Avatar name={n.actor.display_name} uri={n.actor.avatar_url} size={44} />
          <span className="notif__kind">
            <I size={12} aria-hidden />
          </span>
        </span>
      ) : (
        <span className="notif__icon">
          <I size={22} aria-hidden />
        </span>
      )}
      <span className="grow">
        <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <b className="ellipsis notif__title">{n.title}</b>
          <time className="notif__time" dateTime={n.created_at}>
            {timeAgo(n.created_at)}
          </time>
        </span>
        <span className="notif__body">{n.body}</span>
      </span>
      {!n.read ? <span className="notif__new" aria-label="Nouveau" /> : null}
    </>
  );
  const cls = `notif${n.read ? '' : ' is-new'}`;
  if (!n.url) return <div className={cls}>{inner}</div>;
  const to = inApp(n.url);
  if (/^https?:/.test(to))
    return (
      <a href={to} className={cls}>
        {inner}
      </a>
    );
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  );
}

export default function Notifications() {
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await get<{ items: InboxItem[] } & Badge>('/me/inbox');
      setItems(r.items);
      if (r.unread) setBadge(await post<Badge>('/me/inbox/read'));
      else setBadge(r);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Notifications indisponibles.');
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fresh = items?.filter((n) => !n.read) ?? [];
  const older = items?.filter((n) => n.read) ?? [];
  return (
    <TabPage title="Notifications">
      <PageHeader kicker="Quoi de neuf" title="Notifications" />
      <ErrorText>{error}</ErrorText>
      {items === null ? <Loading /> : null}
      {items?.length === 0 && !error ? (
        <Empty
          icon={Bell}
          title="Rien de neuf pour l'instant"
          text="Invitations, rappels, scores à confirmer, défis, demandes d'ami : tout arrivera ici."
          action={
            <ButtonLink to="/friends" icon={UserPlus}>
              Trouver des amis
            </ButtonLink>
          }
        />
      ) : null}
      {fresh.length ? <Kicker>Nouveau</Kicker> : null}
      {fresh.map((n) => (
        <Row key={n.id} n={n} />
      ))}
      {older.length && fresh.length ? <Kicker>Plus tôt</Kicker> : null}
      {older.map((n) => (
        <Row key={n.id} n={n} />
      ))}
      {items?.length ? (
        <p className="sub" style={{ textAlign: 'center', fontSize: 12.5 }}>
          Les notifications sont gardées 90 jours.
        </p>
      ) : null}
    </TabPage>
  );
}
