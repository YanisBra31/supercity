// Discussion d'un match ou d'une équipe. Les nouveaux messages arrivent toutes les 5 secondes tant que la page est visible.
// Entrée envoie, Maj + Entrée passe à la ligne. Survoler un de ses messages permet de l'effacer.
import { MessagesSquare, Send, Trash2 } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, Chat as ChatData, ChatMessage, ChatScope, del, get, post } from '../lib/api';
import { dayLabel, timeLabel } from '../lib/format';
import { Page } from '../ui/Layout';
import { Avatar, Empty, ErrorText, Loading, useConfirm } from '../ui/ui';

const POLL_MS = 5000;

/** Le bas de la page est-il visible ? (on ne fait défiler que si le joueur suivait déjà la conversation) */
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

export default function Chat() {
  const { scope, id } = useParams<{ scope: ChatScope; id: string }>();
  const { ask, dialog } = useConfirm();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastId = useRef(0);
  const stick = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const base = `/chats/${scope}/${id}/messages`;
  const back = scope === 'team' ? `/team/${id}` : `/match/${id}`;

  const merge = (items: ChatMessage[]) => {
    if (!items.length) return;
    lastId.current = Math.max(lastId.current, ...items.map((m) => m.id));
    stick.current = stick.current || nearBottom();
    setChat((c) => (c ? { ...c, items: [...c.items, ...items.filter((m) => !c.items.some((x) => x.id === m.id))] } : c));
  };

  useEffect(() => {
    lastId.current = 0;
    stick.current = true;
    setChat(null);
    get<ChatData>(base)
      .then((c) => {
        lastId.current = c.items.length ? c.items[c.items.length - 1].id : 0;
        setChat(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Discussion indisponible.'));
  }, [base]);

  // Nouveaux messages, tant que l'onglet est affiché.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      get<ChatData>(base, { after: lastId.current })
        .then((c) => merge(c.items))
        .catch(() => undefined);
    };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [base]);

  // En bas de la conversation à l'ouverture et à chaque nouveau message (si on y était déjà).
  useLayoutEffect(() => {
    if (chat && stick.current) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      stick.current = false;
    }
  }, [chat]);

  // Le champ s'agrandit avec le texte.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const m = await post<ChatMessage>(base, { body });
      setText('');
      stick.current = true;
      merge([m]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Message non envoyé.');
    } finally {
      setSending(false);
      input.current?.focus();
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const remove = async (m: ChatMessage) => {
    if (!(await ask('Effacer ce message ?', 'Il disparaîtra pour tout le monde.', 'Effacer'))) return;
    try {
      await del(`/chats/messages/${m.id}`);
      setChat((c) => (c ? { ...c, items: c.items.filter((x) => x.id !== m.id) } : c));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Message non effacé.');
    }
  };

  const title = chat?.title ?? (scope === 'team' ? "Discussion d'équipe" : 'Discussion du match');
  return (
    <Page
      title={title}
      back={back}
      right={
        chat ? (
          <Link to={back} className="topbar__sub">
            {chat.members_count} {scope === 'team' ? 'membre' : 'joueur'}
            {chat.members_count > 1 ? 's' : ''}
          </Link>
        ) : null
      }
      footer={
        chat ? (
          <>
            <ErrorText>{error}</ErrorText>
            <form className="chat-composer" onSubmit={send}>
              <textarea ref={input} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Écris un message…" maxLength={500} rows={1} aria-label="Message" autoFocus />
              <button type="submit" className="chat-composer__send" disabled={!text.trim() || sending} aria-label="Envoyer" title="Envoyer (Entrée)">
                <Send size={18} aria-hidden />
              </button>
            </form>
          </>
        ) : undefined
      }
    >
      {!chat ? (
        error ? <ErrorText>{error}</ErrorText> : <Loading />
      ) : (
        <div className="chat" aria-live="polite">
          {!chat.items.length ? (
            <Empty
              icon={MessagesSquare}
              title="Lance la discussion"
              text={`${chat.members_count} ${scope === 'team' ? 'membre' : 'joueur'}${chat.members_count > 1 ? 's' : ''} ${scope === 'team' ? "de l'équipe" : 'du match'} ${chat.members_count > 1 ? 'verront' : 'verra'} tes messages.`}
            />
          ) : null}
          {chat.items.map((m, i) => {
            const prev = chat.items[i - 1];
            const d = new Date(m.created_at);
            const newDay = !prev || new Date(prev.created_at).toDateString() !== d.toDateString();
            const sameAuthor = !!prev && !newDay && prev.author.id === m.author.id;
            return (
              <div key={m.id}>
                {newDay ? <p className="chat__day">{dayLabel(d)}</p> : null}
                <div className={`chat__line${m.mine ? ' is-mine' : ''}${sameAuthor ? ' is-same' : ''}`}>
                  {!m.mine ? (
                    <span className="chat__avatar">
                      {!sameAuthor ? (
                        <Link to={`/user/${m.author.id}`} tabIndex={-1} aria-hidden>
                          <Avatar name={m.author.display_name} uri={m.author.avatar_url} tone={m.author.accent} size={32} />
                        </Link>
                      ) : null}
                    </span>
                  ) : null}
                  {m.mine ? (
                    <button type="button" className="chat__del" onClick={() => remove(m)} aria-label="Effacer ce message" title="Effacer">
                      <Trash2 size={15} aria-hidden />
                    </button>
                  ) : null}
                  <div className="chat__bubble">
                    {!m.mine && !sameAuthor ? <b className="chat__author">{m.author.display_name}</b> : null}
                    <p>{m.body}</p>
                    <time dateTime={m.created_at}>{timeLabel(d)}</time>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {dialog}
    </Page>
  );
}
