// Modifier son profil : photo, couleur de carte, pseudo, bio, infos de jeu et estimation de sa carte FUT.
import { Camera, Check, Eye } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Accent, ApiError, CardStat, del, Foot, get, Me, patch, PlayerCard, Position, PublicProfile, uploadImage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { FEET, LEVELS, POSITIONS } from '../lib/format';
import { Page } from '../ui/Layout';
import { HelpLink } from '../ui/HelpLink';
import { CARD_STATS, Stars } from '../ui/playercard';
import { Swatches } from '../ui/swatches';
import { ACCENTS, Avatar, Button, ButtonLink, Chips, ErrorText, Field, Kicker, Label, Success, TextArea } from '../ui/ui';

/** Recadre la photo choisie en carré (centre), 512 px max, en JPEG : même rendu que l'appli mobile. */
async function squareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.min(512, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', 0.85));
}

type CardSelf = NonNullable<PlayerCard['self']>;

export default function MeEdit() {
  const { user, updateProfile, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [club, setClub] = useState(user?.favorite_club ?? '');
  const [number, setNumber] = useState(user?.shirt_number != null ? String(user.shirt_number) : '');
  const [accent, setAccent] = useState<Accent>(user?.accent ?? 'orange');
  const [position, setPosition] = useState<Position | null>(user?.position ?? null);
  const [level, setLevel] = useState<number | null>(user?.level ?? null);
  const [foot, setFoot] = useState<Foot | null>(user?.strong_foot ?? null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  // Estimation de la carte : chargée depuis le profil public, envoyée seulement si on y touche.
  const [card, setCard] = useState<CardSelf | null>(null);
  const [cardTouched, setCardTouched] = useState(false);
  useEffect(() => {
    if (user) get<PublicProfile>(`/users/${user.id}`).then((p) => p.card?.self && setCard(p.card.self)).catch(() => undefined);
  }, [user?.id]);
  const touchCard = (next: CardSelf) => {
    setCard(next);
    setCardTouched(true);
    setMsg('');
  };

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setMsg('');
    setError('');
    setSaving(true);
    try {
      await updateProfile({
        display_name: name,
        bio: bio.trim() || null,
        city: city.trim() || null,
        favorite_club: club.trim() || null,
        shirt_number: number === '' ? null : Number(number),
        accent,
        position,
        level,
        strong_foot: foot,
      });
      if (card && cardTouched) {
        await patch('/me/card', { stats: card.stats, weak_foot: card.weak_foot, skill_moves: card.skill_moves });
        setCardTouched(false);
      }
      setMsg('Profil enregistré.');
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    let img: Blob;
    try {
      img = await squareJpeg(file);
    } catch {
      setPhotoError("Impossible d'ouvrir cette photo. Essaie avec une autre.");
      return;
    }
    setUploading(true);
    try {
      setUser(await uploadImage<Me>('/me/avatar', img));
    } catch (err) {
      setPhotoError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : 'Envoi de la photo impossible.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      setUser(await del<Me>('/me/avatar'));
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  };

  if (!user) return null;
  return (
    <Page
      title="Modifier mon profil"
      back="/profile"
      footer={
        <div className="stack" style={{ gap: 8, width: '100%' }}>
          <ErrorText>{error}</ErrorText>
          <Success>{msg}</Success>
          <Button icon={Check} loading={saving} onClick={() => save()} block>
            Enregistrer
          </Button>
        </div>
      }
    >
      <form className="stack" style={{ gap: 16 }} onSubmit={save}>
        <div className="row" style={{ gap: 14 }}>
          <Avatar name={name || user.display_name} uri={user.avatar_url} tone={accent} size={72} />
          <div className="row grow" style={{ flexWrap: 'wrap' }}>
            <Button variant="dark" icon={Camera} loading={uploading} onClick={() => fileRef.current?.click()}>
              {user.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}
            </Button>
            {user.avatar_url ? (
              <Button variant="ghost" onClick={removePhoto}>
                Retirer
              </Button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={changePhoto} />
        </div>
        <ErrorText>{photoError}</ErrorText>

        <Label>Couleur de ma carte</Label>
        <Swatches
          label="Couleur de ma carte"
          options={(Object.keys(ACCENTS) as Accent[]).map((k) => ({ value: k, label: ACCENTS[k].label, stops: (ACCENTS[k].grad.match(/#[0-9a-f]{6}/gi) ?? [ACCENTS[k].solid]) as string[] }))}
          value={accent}
          onChange={(v) => {
            setAccent(v);
            setMsg('');
          }}
        />
        <Field label="Pseudo" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="nickname" />
        <TextArea label={`Bio (${bio.length}/160)`} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} placeholder="Ton style de jeu, tes dispos, ton meilleur but…" />
        <div className="me-grid">
          <Field label="Numéro" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="10" />
          <Field label="Club de cœur" value={club} onChange={(e) => setClub(e.target.value)} maxLength={60} placeholder="Toulouse FC" />
        </div>
        <Field label="Ville" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} autoComplete="address-level2" />
        <Label>Poste</Label>
        <Chips label="Poste" options={POSITIONS} value={position} onChange={setPosition} allowEmpty />
        <Label>Niveau</Label>
        <Chips label="Niveau" options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={level} onChange={setLevel} allowEmpty />
        <Label>Pied fort</Label>
        <Chips label="Pied fort" options={FEET} value={foot} onChange={setFoot} allowEmpty />

        {card ? (
          <>
            <Kicker>Ma carte joueur</Kicker>
            <section className="card stack" style={{ gap: 10 }}>
              <HelpLink q="carte">Comment sont calculées mes stats ?</HelpLink>
              {CARD_STATS.map((s) => (
                <div key={s.key} className="row" style={{ justifyContent: 'space-between' }}>
                  <b style={{ fontWeight: 600 }}>{s.label}</b>
                  <Stars label={s.label} n={card.stats[s.key]} size={24} color="var(--orange-2)" onPick={(n) => touchCard({ ...card, stats: { ...card.stats, [s.key as CardStat]: n } })} />
                </div>
              ))}
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b style={{ fontWeight: 600 }}>Pied faible</b>
                <Stars label="Pied faible" n={card.weak_foot} size={24} color="var(--orange-2)" onPick={(n) => touchCard({ ...card, weak_foot: n })} />
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b style={{ fontWeight: 600 }}>Gestes techniques</b>
                <Stars label="Gestes techniques" n={card.skill_moves} size={24} color="var(--orange-2)" onPick={(n) => touchCard({ ...card, skill_moves: n })} />
              </div>
            </section>
          </>
        ) : null}
        <ButtonLink to={`/user/${user.id}`} variant="ghost" icon={Eye}>
          Voir mon profil public
        </ButtonLink>
        {/* Entrée dans un champ : enregistre. */}
        <button type="submit" hidden />
      </form>
    </Page>
  );
}
