// Nouvelle publication : texte, photo (choisie, glissée ou collée), équipe citée. Ctrl + Entrée publie.
import { ImagePlus, Send, X } from 'lucide-react';
import { ClipboardEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, createPost, get, Team } from '../lib/api';
import { useAuth } from '../lib/auth';
import { shrinkImage } from '../ui/image';
import { Page, useBack } from '../ui/Layout';
import { Avatar, Button, Chips, ErrorText, Label, TextArea } from '../ui/ui';

export default function PostNew() {
  const { user } = useAuth();
  const back = useBack('/feed');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<{ items: Team[] }>('/me/teams').then((r) => setTeams(r.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const take = async (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Choisis une image (JPEG, PNG ou WebP).');
    setError('');
    setImage(await shrinkImage(f, 1600));
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if ((!body.trim() && !image) || loading) return;
    setError('');
    setLoading(true);
    try {
      await createPost({ body: body.trim(), team_id: teamId }, image);
      back();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.fields)[0] ?? err.message) : 'Publication impossible.');
      setLoading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    take(e.dataTransfer.files[0]);
  };
  const onPaste = (e: ClipboardEvent) => {
    const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith('image/'));
    if (f) {
      e.preventDefault();
      take(f);
    }
  };

  return (
    <Page title="Nouvelle publication" back="/feed">
      <form className="stack" style={{ gap: 14 }} onSubmit={submit} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
        <div className="row" style={{ gap: 12 }}>
          <Avatar name={user?.display_name ?? ''} uri={user?.avatar_url} tone={user?.accent} size={44} />
          <b style={{ fontSize: 16 }}>{user?.display_name}</b>
        </div>
        <TextArea
          label={`Ton message (${body.length}/1000)`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
          }}
          maxLength={1000}
          rows={5}
          autoFocus
          placeholder="Un résultat, une photo du match, une annonce…"
          hint="Astuce : glisse ou colle une photo ici. Ctrl + Entrée pour publier."
        />
        {preview ? (
          <div className="post-preview">
            <img src={preview} alt="Photo choisie" />
            <button type="button" className="icon-btn icon-btn--dark" onClick={() => setImage(null)} aria-label="Retirer la photo" title="Retirer la photo">
              <X size={18} aria-hidden />
            </button>
          </div>
        ) : (
          <button type="button" className={`dropzone${drag ? ' is-over' : ''}`} onClick={() => input.current?.click()}>
            <ImagePlus size={26} aria-hidden />
            <b>Ajouter une photo</b>
            <span className="sub">Clique, ou glisse une image ici</span>
          </button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
        {teams.length ? (
          <>
            <Label>Publier au nom de mon équipe</Label>
            <Chips options={teams.map((t) => ({ value: t.id, label: t.name }))} value={teamId} onChange={setTeamId} allowEmpty />
          </>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button type="submit" icon={Send} loading={loading} disabled={!body.trim() && !image} block>
          Publier
        </Button>
      </form>
    </Page>
  );
}
