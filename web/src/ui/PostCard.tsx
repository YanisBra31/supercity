// Publication du fil : auteur, texte, photo, match lié, j'aime et commentaires.
import { Flag, Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { del, Post, post } from '../lib/api';
import { timeAgo, whenLabel } from '../lib/format';
import { RoleBadge } from './grade';
import { Avatar, TeamCrest, useConfirm } from './ui';

/** Petit menu « … » : s'ouvre sous le bouton, se ferme au clic ailleurs ou avec Échap. */
function MoreMenu({ items }: { items: { label: string; icon: typeof Flag; danger?: boolean; run: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn icon-btn--flat" aria-label="Plus d'options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={20} aria-hidden />
      </button>
      {open ? (
        <div className="menu__list" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={`menu__item${it.danger ? ' menu__item--danger' : ''}`}
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              <it.icon size={17} aria-hidden />
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PostCard({ p, onChange, onRemove, detail }: { p: Post; index?: number; onChange: (p: Post) => void; onRemove: (id: number) => void; detail?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(0);
  const { ask, dialog } = useConfirm();
  const navigate = useNavigate();

  const like = async () => {
    if (busy) return;
    setBusy(true);
    setPop((n) => n + 1);
    // Affichage immédiat, corrigé par la réponse du serveur.
    onChange({ ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) });
    try {
      onChange(p.liked ? await del<Post>(`/posts/${p.id}/like`) : await post<Post>(`/posts/${p.id}/like`));
    } catch {
      onChange(p);
    } finally {
      setBusy(false);
    }
  };

  const remove = {
    label: p.is_mine ? 'Supprimer la publication' : 'Supprimer (modération)',
    icon: Trash2,
    danger: true,
    run: async () => {
      if (!(await ask('Supprimer la publication ?', 'Elle disparaîtra du fil pour tout le monde.', 'Supprimer'))) return;
      await del(`/posts/${p.id}`).catch(() => undefined);
      onRemove(p.id);
    },
  };
  const report = {
    label: 'Signaler la publication',
    icon: Flag,
    danger: true,
    run: async () => {
      if (!(await ask('Signaler la publication ?', "Elle ne s'affichera plus pour toi et l'équipe de modération la verra.", 'Signaler'))) return;
      await post(`/posts/${p.id}/report`, {}).catch(() => undefined);
      onRemove(p.id);
    },
  };
  // Un modérateur peut supprimer la publication d'un autre directement, ou la signaler comme tout le monde.
  const items = p.is_mine ? [remove] : p.can_delete ? [remove, report] : [report];

  return (
    <article className="card post">
      <header className="row post__head">
        <Link to={`/user/${p.author.id}`} aria-hidden tabIndex={-1}>
          <Avatar name={p.author.display_name} uri={p.author.avatar_url} tone={p.author.accent} size={42} />
        </Link>
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <Link to={`/user/${p.author.id}`} className="post__author ellipsis">
              {p.author.display_name}
            </Link>
            <RoleBadge role={p.author.site_role} />
          </div>
          <p className="post__meta">
            {detail ? timeAgo(p.created_at) : <Link to={`/post/${p.id}`}>{timeAgo(p.created_at)}</Link>}
            {p.team ? ` · ${p.team.name}` : ''}
          </p>
        </div>
        {p.team ? (
          <Link to={`/team/${p.team.id}`} title={p.team.name}>
            <TeamCrest name={p.team.name} logo={p.team.logo_url} primary={p.team.color_primary} secondary={p.team.color_secondary} size={30} />
          </Link>
        ) : null}
        <MoreMenu items={items} />
      </header>

      {p.body ? <p className={`post__body${p.kind === 'challenge' ? ' post__body--challenge' : ''}`}>{p.body}</p> : null}
      {p.image_url ? (
        detail ? (
          <a href={p.image_url} target="_blank" rel="noreferrer" className="post__image">
            <img src={p.image_url} alt="" loading="lazy" />
          </a>
        ) : (
          <Link to={`/post/${p.id}`} className="post__image">
            <img src={p.image_url} alt="" loading="lazy" />
          </Link>
        )
      ) : null}

      {p.match ? (
        <Link to={`/match/${p.match.id}`} className="post__match">
          {p.match.home_team ? (
            <TeamCrest name={p.match.home_team.name} logo={p.match.home_team.logo_url} primary={p.match.home_team.color_primary} secondary={p.match.home_team.color_secondary} size={34} />
          ) : null}
          <span className="grow" style={{ textAlign: 'center' }}>
            <b>
              {p.match.home_team?.name ?? 'Match'} <span style={{ color: 'var(--orange-1)' }}>vs</span> {p.match.away_team?.name ?? '?'}
            </b>
            <span>
              {whenLabel(p.match.starts_at)} · {p.match.venue.name}
            </span>
          </span>
          {p.match.away_team ? (
            <TeamCrest name={p.match.away_team.name} logo={p.match.away_team.logo_url} primary={p.match.away_team.color_primary} secondary={p.match.away_team.color_secondary} size={34} />
          ) : null}
        </Link>
      ) : null}

      <footer className="row post__actions">
        <button type="button" className={`post__act${p.liked ? ' is-on' : ''}`} onClick={like} aria-pressed={p.liked} aria-label={p.liked ? "Je n'aime plus" : "J'aime"} title={p.liked ? "Je n'aime plus" : "J'aime"}>
          <Heart key={pop} size={21} aria-hidden fill={p.liked ? 'currentColor' : 'none'} className={pop ? 'post__pop' : undefined} />
          {p.likes_count}
        </button>
        {detail ? (
          <span className="post__act" aria-label={`${p.comments_count} commentaires`}>
            <MessageCircle size={20} aria-hidden />
            {p.comments_count}
          </span>
        ) : (
          <button type="button" className="post__act" onClick={() => navigate(`/post/${p.id}`)} aria-label={`Commentaires (${p.comments_count})`} title="Commenter">
            <MessageCircle size={20} aria-hidden />
            {p.comments_count}
          </button>
        )}
      </footer>
      {dialog}
    </article>
  );
}
