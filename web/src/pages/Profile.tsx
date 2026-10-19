// Profil du joueur : son profil public tel que les autres le voient, avec ses boutons à soi (modifier, boutique, amis, réglages).
import { Briefcase, ChevronDown, ChevronUp, LogOut, MailWarning, Package, Pencil, Settings, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { get, Match, Post, PublicProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useBadge } from '../lib/badge';
import { loadItem, saveItem } from '../lib/storage';
import { TabPage } from '../ui/Layout';
import { MatchCard } from '../ui/MatchCard';
import { ProfileView } from '../ui/profile/ProfileView';
import { Banner, Button, ButtonLink, ErrorText, IconButton, Kicker, Loading, useToast } from '../ui/ui';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const badge = useBadge();
  const { show, toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allMatches, setAllMatches] = useState(false);

  useEffect(() => {
    if (!user) return;
    get<{ items: Match[] }>('/me/matches').then((r) => setMatches(r.items)).catch(() => undefined);
    get<PublicProfile>(`/users/${user.id}`).then(setPub).catch(() => undefined);
    get<{ items: Post[] }>('/feed', { author_id: user.id, limit: 10 }).then((r) => setPosts(r.items)).catch(() => undefined);
    // Le profil se recharge quand on modifie son pseudo, sa couleur ou ses cosmétiques.
  }, [user]);

  // Nouveau grade ou carte tout juste confirmée depuis la dernière visite : on fête ça une fois.
  useEffect(() => {
    if (!pub?.grade) return;
    const key = `seen_${pub.id}`;
    let seen: { grade: number; card: boolean } | null = null;
    try {
      seen = JSON.parse(loadItem(key) ?? 'null');
    } catch {
      seen = null;
    }
    const now = { grade: pub.grade.level, card: !!pub.card && !pub.card.estimated };
    if (seen && now.grade > seen.grade) show(`🏆 Nouveau grade : ${pub.grade.label}. Bien joué !`);
    else if (seen && now.card && !seen.card) show(`⭐ Ta carte est confirmée : tes coéquipiers t'ont noté ${pub.card!.overall}.`);
    if (!seen || now.grade !== seen.grade || now.card !== seen.card) saveItem(key, JSON.stringify(now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub]);

  if (!user) return null;
  const staff = user.site_role === 'moderator' || user.site_role === 'admin';

  return (
    <TabPage title="Profil">
      {!pub ? (
        <Loading />
      ) : (
        <ProfileView
          p={pub}
          me
          posts={posts}
          setPosts={setPosts}
          onAvatarPress={() => navigate('/me/edit')}
          actions={
            <div className="row" style={{ gap: 8 }}>
              <ButtonLink to="/me/edit" icon={Pencil} variant="dark" className="grow">
                Modifier
              </ButtonLink>
              <IconButton icon={ShoppingBag} label="Boutique" to="/shop" />
              <IconButton icon={Package} label="Inventaire" to="/inventory" />
              <IconButton icon={Users} label="Mes amis" to="/friends" badge={badge.friend_requests} />
              <IconButton icon={Settings} label="Réglages" to="/settings" />
            </div>
          }
        >
          {!user.email_verified ? <Banner icon={MailWarning} title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." to="/verify" /> : null}
          {user.suspended_until ? (
            <ErrorText>{`Ton compte est suspendu jusqu'au ${new Date(user.suspended_until).toLocaleDateString('fr-FR')}${user.suspended_reason ? ` (${user.suspended_reason})` : ''}. Tu peux consulter l'appli, mais pas publier ni organiser.`}</ErrorText>
          ) : null}
          {matches.length ? (
            <>
              <Kicker>{matches.length > 1 ? 'Mes prochains matchs' : 'Mon prochain match'}</Kicker>
              {(allMatches ? matches : matches.slice(0, 1)).map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
              {matches.length > 1 ? (
                <Button variant="ghost" icon={allMatches ? ChevronUp : ChevronDown} onClick={() => setAllMatches(!allMatches)}>
                  {allMatches ? 'Masquer' : `Voir les ${matches.length - 1} autres`}
                </Button>
              ) : null}
            </>
          ) : null}
        </ProfileView>
      )}
      <nav className="card set-group" aria-label="Mon compte">
        {staff ? (
          <Link to="/moderation" className="set-row">
            <ShieldCheck size={22} aria-hidden className="set-row__icon" />
            <b className="grow">{user.site_role === 'admin' ? 'Administration' : 'Modération'}</b>
          </Link>
        ) : null}
        <Link to="/pro" className="set-row">
          <Briefcase size={22} aria-hidden className="set-row__icon" />
          <b className="grow">Espace pro</b>
        </Link>
        <button
          type="button"
          className="set-row"
          onClick={async () => {
            navigate('/', { replace: true });
            await logout();
          }}
        >
          <LogOut size={22} aria-hidden className="set-row__icon" />
          <b className="grow">Se déconnecter</b>
        </button>
      </nav>
      {toast}
    </TabPage>
  );
}
