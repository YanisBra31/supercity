// Une publication et ses commentaires.
import { Send } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, Comment, del, get, Post, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { Page, useBack } from '../ui/Layout';
import { PostCard } from '../ui/PostCard';
import { Avatar, ErrorText, Kicker, Loading, useConfirm } from '../ui/ui';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const back = useBack('/feed');
  const { ask, dialog } = useConfirm();
  const [p, setP] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setP(await get<Post>(`/posts/${id}`));
      setComments((await get<{ items: Comment[] }>(`/posts/${id}/comments`)).items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Publication introuvable.');
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const c = await post<Comment>(`/posts/${id}/comments`, { body: text.trim() });
      setComments((prev) => [...prev, c]);
      setP((prev) => (prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev));
      setText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  const remove = async (c: Comment) => {
    if (!(await ask('Supprimer ce commentaire ?', 'Il disparaîtra pour tout le monde.', 'Supprimer'))) return;
    await del(`/comments/${c.id}`).catch(() => undefined);
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    setP((prev) => (prev ? { ...prev, comments_count: prev.comments_count - 1 } : prev));
  };

  return (
    <Page
      title="Publication"
      back="/feed"
      footer={
        p ? (
          <form className="row comment-box" onSubmit={send}>
            <Avatar name={user?.display_name ?? ''} uri={user?.avatar_url} tone={user?.accent} size={34} />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écris un commentaire…" maxLength={500} aria-label="Commentaire" />
            <button type="submit" className="icon-btn" disabled={!text.trim() || sending} aria-label="Envoyer" title="Envoyer">
              <Send size={19} aria-hidden />
            </button>
          </form>
        ) : undefined
      }
    >
      {!p ? error ? <ErrorText>{error}</ErrorText> : <Loading /> : (
        <>
          <PostCard p={p} onChange={setP} onRemove={back} detail />
          <Kicker>{comments.length ? `Commentaires (${comments.length})` : 'Aucun commentaire'}</Kicker>
          {comments.map((c) => (
            <div key={c.id} className="row comment">
              <Link to={`/user/${c.author.id}`} tabIndex={-1} aria-hidden>
                <Avatar name={c.author.display_name} uri={c.author.avatar_url} tone={c.author.accent} size={34} />
              </Link>
              <div className="comment__bubble grow">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Link to={`/user/${c.author.id}`} className="comment__author">
                    {c.author.display_name}
                  </Link>
                  <span className="comment__time">{timeAgo(c.created_at)}</span>
                </div>
                <p>{c.body}</p>
                {c.can_delete ? (
                  <button type="button" className="link comment__del" onClick={() => remove(c)}>
                    Supprimer
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          <ErrorText>{error}</ErrorText>
        </>
      )}
      {dialog}
    </Page>
  );
}
