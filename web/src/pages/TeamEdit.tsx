// Personnalisation d'une équipe par son capitaine : logo, couleurs, présentation.
import { ImagePlus } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError, del, Format, get, patch, Team, uploadImage } from '../lib/api';
import { FORMATS } from '../lib/format';
import { shrinkImage } from '../ui/image';
import { Swatches, TEAM_COLORS } from '../ui/swatches';
import { Page, useBack } from '../ui/Layout';
import { Button, Chips, ErrorText, Field, Kicker, Label, Loading, readableOn, Success, Switch, TeamCrest, TextArea } from '../ui/ui';

const swatches = TEAM_COLORS.map((c) => ({ value: c.value, label: c.label, stops: [c.value] as const }));

export default function TeamEdit() {
  const { id } = useParams();
  const back = useBack(`/team/${id}`);
  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [primary, setPrimary] = useState('#ff5223');
  const [secondary, setSecondary] = useState('#1f1a17');
  const [format, setFormat] = useState<Format | null>(null);
  const [year, setYear] = useState('');
  const [recruiting, setRecruiting] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<Team>(`/teams/${id}`)
      .then((t) => {
        setTeam(t);
        setName(t.name);
        setCity(t.city ?? '');
        setDescription(t.description ?? '');
        setPrimary(t.color_primary.toLowerCase());
        setSecondary(t.color_secondary.toLowerCase());
        setFormat(t.usual_format);
        setYear(t.founded_year ? String(t.founded_year) : '');
        setRecruiting(t.recruiting);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Équipe introuvable.'));
  }, [id]);

  if (!team)
    return (
      <Page title="Personnaliser l'équipe" back={`/team/${id}`}>
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

  const changeLogo = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    setUploading(true);
    try {
      setTeam(await uploadImage<Team>(`/teams/${id}/logo`, await shrinkImage(f, 1024, true)));
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : 'Envoi du logo impossible.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSaving(true);
    try {
      await patch<Team>(`/teams/${id}`, {
        name,
        city: city.trim() || null,
        description: description.trim() || null,
        color_primary: primary,
        color_secondary: secondary,
        usual_format: format,
        founded_year: year ? Number(year) : null,
        recruiting,
      });
      setMsg('Équipe enregistrée.');
      setTimeout(back, 700);
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.fields)[0] ?? err.message) : 'Enregistrement impossible.');
      setSaving(false);
    }
  };

  const ink = readableOn(primary);
  return (
    <Page title="Personnaliser l'équipe" back={`/team/${id}`}>
      <form className="stack" style={{ gap: 14 }} onSubmit={save}>
        {/* Aperçu en direct du maillot de l'équipe. */}
        <div className="hero row" style={{ background: `linear-gradient(135deg, ${primary}, ${primary} 50%, ${secondary})`, color: ink, gap: 14 }}>
          <button type="button" className="crest-btn" onClick={() => file.current?.click()} aria-label="Changer le logo" title="Changer le logo">
            <TeamCrest name={name || team.name} logo={team.logo_url} primary={secondary} secondary={primary} size={72} />
          </button>
          <div className="grow">
            <p style={{ fontSize: 11, letterSpacing: 2, fontWeight: 600, opacity: 0.85 }}>APERÇU</p>
            <p style={{ fontSize: 22, lineHeight: 1.25, fontWeight: 800 }}>{name || team.name}</p>
            <p style={{ fontSize: 12, opacity: 0.9 }}>{[city, year ? `depuis ${year}` : null].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { changeLogo(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="row">
          <Button icon={ImagePlus} variant="dark" loading={uploading} onClick={() => file.current?.click()} className="grow">
            {team.logo_url ? 'Changer le logo' : 'Ajouter un logo'}
          </Button>
          {team.logo_url ? (
            <Button variant="ghost" onClick={async () => setTeam(await del<Team>(`/teams/${id}/logo`))}>
              Retirer
            </Button>
          ) : null}
        </div>

        <Kicker>Couleurs du maillot</Kicker>
        <Label>Principale</Label>
        <Swatches label="Couleur principale" options={swatches} value={primary} onChange={setPrimary} />
        <Label>Secondaire</Label>
        <Swatches label="Couleur secondaire" options={swatches} value={secondary} onChange={setSecondary} />

        <Kicker>Présentation</Kicker>
        <Field label="Nom de l'équipe" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <TextArea label={`Description (${description.length}/300)`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} placeholder="Votre histoire, votre style de jeu, vos créneaux…" />
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <Field label="Ville" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Création" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="2020" />
          </div>
        </div>
        <Label>Format habituel</Label>
        <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={setFormat} allowEmpty />
        <Switch title="On recrute" text="Affiche « On recrute ! » sur la page de l'équipe." checked={recruiting} onChange={setRecruiting} />
        <ErrorText>{error}</ErrorText>
        <Success>{msg}</Success>
        <Button type="submit" loading={saving} block>
          Enregistrer
        </Button>
      </form>
    </Page>
  );
}
