// Profil public d'un joueur, tel que tout le monde le voit : bannière, carte joueur, grade, infos, équipes, publications.
// La page Profil affiche le même, avec ses boutons à soi (`actions`, `children`).
import { BarChart3, Footprints, Heart, MapPin, Shirt, Volleyball } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { get, Post, PublicProfile } from '../../lib/api';
import { FEET, LEVELS, POSITIONS } from '../../lib/format';
import { BannerPattern, bannerBackground, FramedAvatar, TitleTag } from '../cosmetics';
import { GradeBadge, GradeCard, RoleBadge } from '../grade';
import { PlayerCardView } from '../playercard';
import { PostCard } from '../PostCard';
import { ACCENTS, Icon, Kicker, Pill, TeamCrest } from '../ui';
import { ProfileCards } from './ProfileCards';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

type Props = {
  /** Le profil affiché (`user` est accepté aussi). */
  p?: PublicProfile;
  user?: PublicProfile;
  /** C'est mon profil : la photo devient cliquable si `onAvatarPress` est fourni. */
  me?: boolean;
  /** Publications du joueur ; sans elles, la vue les charge toute seule. */
  posts?: Post[];
  setPosts?: (fn: (prev: Post[]) => Post[]) => void;
  onAvatarPress?: () => void;
  /** Boutons sous la bannière (Modifier, Boutique, Partager, Réglages, Ajouter en ami…). */
  actions?: ReactNode;
  /** Ce que seul le joueur voit de son profil, juste sous les boutons. */
  children?: ReactNode;
};

export function ProfileView({ p: given, user, posts: givenPosts, setPosts: givenSetPosts, onAvatarPress, actions, children }: Props) {
  const p = (given ?? user)!;
  const [ownPosts, setOwnPosts] = useState<Post[]>([]);
  const external = givenPosts !== undefined;
  useEffect(() => {
    if (external) return;
    get<{ items: Post[] }>('/feed', { author_id: p.id, limit: 10 })
      .then((r) => setOwnPosts(r.items))
      .catch(() => undefined);
  }, [p.id, external]);
  const posts = givenPosts ?? ownPosts;
  const setPosts = givenSetPosts ?? setOwnPosts;

  const since = new Date(p.member_since);
  const facts: [Icon, string, string | null][] = [
    [Volleyball, 'Poste', p.position ? (POSITIONS.find((x) => x.value === p.position)?.label ?? null) : null],
    [BarChart3, 'Niveau', p.level ? LEVELS[p.level - 1] : null],
    [Footprints, 'Pied fort', p.strong_foot ? (FEET.find((x) => x.value === p.strong_foot)?.label ?? null) : null],
    [Heart, 'Club de cœur', p.favorite_club],
    [MapPin, 'Ville', p.city],
  ];
  const avatar = <FramedAvatar frame={p.cosmetics?.frame} name={p.display_name} uri={p.avatar_url} size={88} tone={p.accent} />;
  const banner = p.cosmetics?.banner;
  const kickerColor = banner ? 'var(--chalk)' : p.accent === 'nuit' ? 'var(--orange-1)' : 'var(--night)';

  return (
    <>
      <section className="hero profile-hero" style={{ background: bannerBackground(banner) ?? ACCENTS[p.accent]?.grad }}>
        <BannerPattern banner={banner} />
        <p className="kicker" style={{ color: kickerColor, position: 'relative' }}>
          Sur Supercity depuis {MONTHS[since.getMonth()]} {since.getFullYear()}
        </p>
        <div className="profile-hero__head">
          {onAvatarPress ? (
            <button type="button" className="profile-hero__avatar" onClick={onAvatarPress} aria-label="Changer ma photo" title="Changer ma photo">
              {avatar}
            </button>
          ) : (
            avatar
          )}
          <div className="grow stack" style={{ gap: 4 }}>
            <h2 className="profile-hero__name">{p.display_name}</h2>
            <TitleTag title={p.cosmetics?.title} />
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <GradeBadge grade={p.grade} size="md" />
              <RoleBadge role={p.site_role} />
            </div>
            {p.bio ? <p className="profile-hero__bio">{p.bio}</p> : null}
          </div>
          {p.shirt_number != null ? (
            <span className="profile-hero__shirt" title={`Numéro ${p.shirt_number}`}>
              <Shirt size={50} fill="var(--night)" strokeWidth={1} aria-hidden />
              <b>{p.shirt_number}</b>
            </span>
          ) : null}
        </div>
        <dl className="profile-hero__stats">
          {(
            [
              [p.stats?.played ?? 0, 'Matchs joués'],
              [p.stats?.organized ?? 0, 'Organisés'],
              [p.teams?.length ?? 0, p.teams?.length === 1 ? 'Équipe' : 'Équipes'],
            ] as const
          ).map(([n, l]) => (
            <div key={l}>
              <dd>{n}</dd>
              <dt>{l}</dt>
            </div>
          ))}
        </dl>
      </section>
      {actions}
      {children}
      <ProfileCards
        pages={[
          ...(p.grade ? [{ title: 'Grade', render: () => <GradeCard grade={p.grade} /> }] : []),
          ...(p.card ? [{ title: 'Carte joueur', render: (visit: number) => <PlayerCardView key={visit} card={p.card!} name={p.display_name} uri={p.avatar_url} position={p.position} /> }] : []),
        ]}
      />

      <dl className="card facts">
        {facts.map(([I, label, value]) => (
          <div key={label} className="row facts__row">
            <dt className="row">
              <I size={18} aria-hidden />
              {label}
            </dt>
            <dd className={value ? undefined : 'is-empty'}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      {p.teams?.length ? <Kicker>Équipes</Kicker> : null}
      {(p.teams ?? []).map((t) => (
        <Link key={t.id} to={`/team/${t.id}`} className="card row team-row">
          <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={44} />
          <b className="grow ellipsis">{t.name}</b>
          {t.role === 'captain' ? <Pill text="Capitaine" /> : null}
        </Link>
      ))}

      {posts.length ? <Kicker>Publications</Kicker> : null}
      {posts.map((x) => (
        <PostCard
          key={x.id}
          p={x}
          onChange={(np) => setPosts((prev) => prev.map((y) => (y.id === np.id ? np : y)))}
          onRemove={(pid) => setPosts((prev) => prev.filter((y) => y.id !== pid))}
        />
      ))}
    </>
  );
}
