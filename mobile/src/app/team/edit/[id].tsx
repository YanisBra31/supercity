// Personnalisation d'une équipe par son capitaine : logo, couleurs, présentation.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Swatches, TEAM_COLORS } from '../../../components/AccentPicker';
import { Gradient } from '../../../components/brand';
import { Button, Chips, colors, ErrorText, Field, font, Kicker, Label, Loading, readableOn, s, Screen, Success, TeamCrest } from '../../../components/ui';
import { ApiError, del, Format, get, patch, Team, uploadImage } from '../../../lib/api';
import { FORMATS } from '../../../lib/format';
import { pickLogoImage } from '../../../lib/pickImage';

const swatches = TEAM_COLORS.map((c) => ({ value: c.value, label: c.label, stops: [c.value, c.value] as const }));

export default function EditTeam() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  useEffect(() => {
    get<Team>(`/teams/${id}`).then((t) => {
      setTeam(t);
      setName(t.name);
      setCity(t.city ?? '');
      setDescription(t.description ?? '');
      setPrimary(t.color_primary);
      setSecondary(t.color_secondary);
      setFormat(t.usual_format);
      setYear(t.founded_year ? String(t.founded_year) : '');
      setRecruiting(t.recruiting);
    });
  }, [id]);

  if (!team) return <Loading />;

  const changeLogo = async () => {
    setError('');
    let img;
    try {
      img = await pickLogoImage();
    } catch {
      setError("Impossible d'ouvrir cette image. Essaie avec une autre.");
      return;
    }
    if (!img) return;
    setUploading(true);
    try {
      setTeam(await uploadImage<Team>(`/teams/${id}/logo`, img));
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Envoi du logo impossible.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
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
      setTimeout(() => router.back(), 700);
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {/* Aperçu en direct du maillot de l'équipe. */}
      <Gradient colors={[primary, primary, secondary]} style={{ borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={changeLogo} accessibilityRole="button" accessibilityLabel="Changer le logo">
          <TeamCrest name={name || team.name} logo={team.logo_url} primary={secondary} secondary={primary} size={72} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ ...font.semibold, fontSize: 11, letterSpacing: 2, color: readableOn(primary), opacity: 0.85 }}>APERÇU</Text>
          <Text style={{ ...font.extrabold, fontSize: 22, lineHeight: 28, color: readableOn(primary) }}>{name || team.name}</Text>
          <Text style={{ ...font.regular, fontSize: 12, color: readableOn(primary), opacity: 0.9 }}>{[city, year ? `depuis ${year}` : null].filter(Boolean).join(' · ')}</Text>
        </View>
      </Gradient>

      <View style={s.row}>
        <Button title={team.logo_url ? 'Changer le logo' : 'Ajouter un logo'} icon="image-outline" variant="dark" loading={uploading} onPress={changeLogo} style={{ flex: 1 }} />
        {team.logo_url ? (
          <Button title="Retirer" variant="ghost" onPress={async () => setTeam(await del<Team>(`/teams/${id}/logo`))} />
        ) : null}
      </View>

      <Kicker>Couleurs du maillot</Kicker>
      <Label>Principale</Label>
      <Swatches options={swatches} value={primary} onChange={setPrimary} />
      <Label>Secondaire</Label>
      <Swatches options={swatches} value={secondary} onChange={setSecondary} />

      <Kicker>Présentation</Kicker>
      <Field label="Nom de l'équipe" value={name} onChangeText={setName} maxLength={60} />
      <Field
        label={`Description (${description.length}/300)`}
        value={description}
        onChangeText={setDescription}
        maxLength={300}
        multiline
        placeholder="Votre histoire, votre style de jeu, vos créneaux…"
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <View style={s.row}>
        <View style={{ flex: 2 }}>
          <Field label="Ville" value={city} onChangeText={setCity} maxLength={80} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Création" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="2020" />
        </View>
      </View>
      <Label>Format habituel</Label>
      <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={setFormat} allowEmpty />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...font.bold, fontSize: 15, color: colors.ink }}>On recrute</Text>
          <Text style={s.sub}>Affiche « On recrute ! » sur la page de l'équipe.</Text>
        </View>
        <Switch value={recruiting} onValueChange={setRecruiting} trackColor={{ true: colors.orange2, false: colors.line }} thumbColor={colors.white} {...({ activeThumbColor: colors.white } as object)} />
      </View>
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      <Button title="Enregistrer" onPress={save} loading={saving} />
    </Screen>
  );
}
