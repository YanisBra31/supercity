// Fil d'actualité : publications de tous les joueurs ou de mes équipes.
import { Image as ImageIcon, Newspaper, PenSquare } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, get, Post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { TabPage } from '../ui/Layout';
import { PostCard } from '../ui/PostCard';
import { Avatar, Ball, ButtonLink, Chips, Empty, ErrorText, Loading, PageHeader } from '../ui/ui';

type Scope = 'all' | 'teams';
const PAGE = 20;

export default function Feed() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('all');
  const [items, setItems] = useState<Post[] | null>(null);
  const [error, setError] = useState('');
  const [more, setMore] = useState(true);
  const loadingMore = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await get<{ items: Post[] }>('/feed', { scope, limit: PAGE });
      setItems(r.items);
      setMore(r.items.length === PAGE);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de charger le fil.');
      setItems((prev) => prev ?? []);
    }
  }, [scope]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!items?.length || !more || loadingMore.current) return;
    loadingMore.current = true;
    const r = await get<{ items: Post[] }>('/feed', { scope, limit: PAGE, before_id: items[items.length - 1].id }).catch(() => ({ items: [] as Post[] }));
    setItems((prev) => [...(prev ?? []), ...r.items.filter((p) => !prev?.some((x) => x.id === p.id))]);
    setMore(r.items.length === PAGE);
    loadingMore.current = false;
  }, [items, more, scope]);

  // Défilement infini : on charge la suite quand le bas de la liste approche.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && loadMore(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const update = (p: Post) => setItems((prev) => prev?.map((x) => (x.id === p.id ? p : x)) ?? null);
  const remove = (id: number) => setItems((prev) => prev?.filter((x) => x.id !== id) ?? null);

  return (
    <TabPage title="Le fil">
      <PageHeader kicker="Dans les vestiaires" title="Le fil" sub="Résultats, photos, annonces des terrains." />
      <Link to="/post/new" className="card row composer-link">
        <Avatar name={user?.display_name ?? ''} uri={user?.avatar_url} tone={user?.accent} size={40} />
        <span className="grow sub" style={{ fontSize: 15 }}>
          Quoi de neuf sur le terrain ?
        </span>
        <ImageIcon size={22} aria-hidden style={{ color: 'var(--orange-2)' }} />
      </Link>
      <Chips
        label="Publications à afficher"
        options={[
          { value: 'all', label: 'Tout le monde' },
          { value: 'teams', label: 'Mes équipes' },
        ]}
        value={scope}
        onChange={(v) => v && setScope(v)}
      />
      <ErrorText>{error}</ErrorText>
      {items === null ? <Loading /> : null}
      {items?.length === 0 ? (
        <Empty
          icon={Newspaper}
          title="Rien pour l'instant"
          text={scope === 'teams' ? 'Tes coéquipiers n’ont encore rien publié. Lance le mouvement !' : 'Sois le premier à publier.'}
          action={
            <ButtonLink to="/post/new" icon={PenSquare}>
              Publier
            </ButtonLink>
          }
        />
      ) : null}
      {items?.map((p) => (
        <PostCard key={p.id} p={p} onChange={update} onRemove={remove} />
      ))}
      <div ref={sentinel} />
      {items?.length && more ? (
        <div className="loading" style={{ padding: 16 }}>
          <Ball size={20} />
        </div>
      ) : null}
    </TabPage>
  );
}
