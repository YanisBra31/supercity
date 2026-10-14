// Modifier son profil : photo, couleur de carte, pseudo, bio, infos de jeu. Enregistrer reste en bas de l'écran.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Swatches } from '../../components/AccentPicker';
import { ACCENTS, AccentName } from '../../components/brand';
import { Button, Chips, ErrorText, Field, Label, s, Screen, Success } from '../../components/ui';
import { ApiError, del, Foot, Me, Position, uploadImage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { FEET, LEVELS, POSITIONS } from '../../lib/format';
import { pickSquareImage } from '../../lib/pickImage';

export default function EditProfile() {
  const { user, updateProfile, setUser } = useAuth();
  const [name, setName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [club, setClub] = useState(user?.favorite_club ?? '');
  const [number, setNumber] = useState(user?.shirt_number != null ? String(user.shirt_number) : '');
  const [accent, setAccent] = useState<AccentName>(user?.accent ?? 'orange');
  const [position, setPosition] = useState<Position | null>(user?.position ?? null);
  const [level, setLevel] = useState<number | null>(user?.level ?? null);
  const [foot, setFoot] = useState<Foot | null>(user?.strong_foot ?? null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const save = async () => {
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
      setMsg('Profil enregistré.');
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    setPhotoError('');
    setPhotoError('');
    let img;
    try {
      img = await pickSquareImage();
    } catch {
      setPhotoError("Impossible d'ouvrir cette photo. Essaie avec une autre.");
      return;
    }
    if (!img) return;
    setUploading(true);
    try {
      setUser(await uploadImage<Me>('/me/avatar', img));
    } catch (e) {
      setPhotoError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : "Envoi de la photo impossible.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      setUser(await del<Me>('/me/avatar'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Suppression impossible.');
    }
  };

  if (!user) return null;
  return (
    <Screen
      footer={
        <>
          <ErrorText>{error}</ErrorText>
          <Success>{msg}</Success>
          <Button title="Enregistrer" icon="checkmark" onPress={save} loading={saving} />
        </>
      }
    >
      <View style={s.row}>
        <Button title={user.avatar_url ? 'Changer la photo' : 'Ajouter une photo'} icon="camera-outline" variant="dark" loading={uploading} onPress={changePhoto} style={{ flex: 1 }} />
        {user.avatar_url ? <Button title="Retirer" variant="ghost" onPress={removePhoto} /> : null}
      </View>
      <ErrorText>{photoError}</ErrorText>
      <Label>Couleur de ma carte</Label>
      <Swatches
        options={(Object.keys(ACCENTS) as AccentName[]).map((k) => ({ value: k, stops: ACCENTS[k].stops, label: ACCENTS[k].label }))}
        value={accent}
        onChange={setAccent}
      />
      <Field label="Pseudo" value={name} onChangeText={setName} maxLength={40} />
      <Field
        label={`Bio (${bio.length}/160)`}
        value={bio}
        onChangeText={setBio}
        maxLength={160}
        multiline
        placeholder="Ton style de jeu, tes dispos, ton meilleur but…"
        style={{ minHeight: 70, textAlignVertical: 'top' }}
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field label="Numéro" value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="10" />
        </View>
        <View style={{ flex: 2.2 }}>
          <Field label="Club de cœur" value={club} onChangeText={setClub} maxLength={60} placeholder="Toulouse FC" />
        </View>
      </View>
      <Field label="Ville" value={city} onChangeText={setCity} maxLength={80} />
      <Label>Poste</Label>
      <Chips options={POSITIONS} value={position} onChange={setPosition} allowEmpty />
      <Label>Niveau</Label>
      <Chips options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={level} onChange={setLevel} allowEmpty />
      <Label>Pied fort</Label>
      <Chips options={FEET} value={foot} onChange={setFoot} allowEmpty />
      <Button title="Voir mon profil public" variant="ghost" icon="eye-outline" onPress={() => router.push(`/user/${user.id}`)} />

    </Screen>
  );
}
