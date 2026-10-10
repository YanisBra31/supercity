// Profil du joueur : carte personnalisée, stats, prochains matchs, édition.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swatches } from '../../components/AccentPicker';
import { ACCENTS, AccentName, FadeIn, Hero } from '../../components/brand';
import { MatchCard } from '../../components/MatchCard';
import { Avatar, Banner, Button, Chips, colors, ErrorText, Field, font, Kicker, Label, Pill, s, Screen, Success, TeamCrest } from '../../components/ui';
import { ApiError, del, Foot, get, Match, Me, Position, PublicProfile, uploadImage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { FEET, LEVELS, POSITIONS } from '../../lib/format';
import { pickSquareImage } from '../../lib/pickImage';
import { GradeBadge, GradeCard, RoleBadge } from '../../components/Grade';

export default function Profile() {
  const { user, updateProfile, logout, setUser } = useAuth();
  const [name, setName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [club, setClub] = useState(user?.favorite_club ?? '');
  const [number, setNumber] = useState(user?.shirt_number != null ? String(user.shirt_number) : '');
  const [accent, setAccent] = useState<AccentName>(user?.accent ?? 'orange');
  const [position, setPosition] = useState<Position | null>(user?.position ?? null);
  const [level, setLevel] = useState<number | null>(user?.level ?? null);
  const [foot, setFoot] = useState<Foot | null>(user?.strong_foot ?? null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useFocusEffect(
    useCallback(() => {
      get<{ items: Match[] }>('/me/matches').then((r) => setMatches(r.items)).catch(() => undefined);
      if (user) get<PublicProfile>(`/users/${user.id}`).then(setPub).catch(() => undefined);
    }, [user])
  );

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
  const tags = [
    position ? POSITIONS.find((p) => p.value === position)!.label : null,
    level ? LEVELS[level - 1] : null,
    foot ? `Pied ${FEET.find((f) => f.value === foot)!.label.toLowerCase()}` : null,
    user.favorite_club ? `❤ ${user.favorite_club}` : null,
    user.city,
  ].filter(Boolean) as string[];

  return (
    <Screen top>
      <Hero tone={accent} kicker="Ton profil de joueur" kickerColor={accent === 'nuit' ? colors.orange1 : colors.night} title="">
        <View style={st.head}>
          <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Changer ma photo">
            <Avatar name={user.display_name} uri={user.avatar_url} size={92} tone="night" ring />
            <View style={st.camera}>
              <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={16} color={colors.chalk} />
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.name} numberOfLines={2}>
              {user.display_name}
            </Text>
            <View style={[s.row, { gap: 6 }]}>
              <GradeBadge grade={user.grade ?? pub?.grade} size="md" />
              <RoleBadge role={user.site_role} />
            </View>
            {user.bio ? <Text style={st.bio}>{user.bio}</Text> : <Text style={[st.bio, { opacity: 0.7 }]}>Ajoute une bio pour te présenter.</Text>}
          </View>
          {user.shirt_number != null ? (
            <View style={st.shirt}>
              <Ionicons name="shirt" size={46} color={colors.night} />
              <Text style={st.shirtNum}>{user.shirt_number}</Text>
            </View>
          ) : null}
        </View>
        {tags.length ? (
          <View style={[s.row, { flexWrap: 'wrap', marginTop: 12 }]}>
            {tags.map((t) => (
              <Pill key={t} text={t} tone="dark" />
            ))}
          </View>
        ) : null}
        <View style={st.stats}>
          {[
            [pub?.stats?.played ?? 0, 'Matchs joués'],
            [pub?.stats?.organized ?? 0, 'Organisés'],
            [pub?.teams?.length ?? 0, pub?.teams?.length === 1 ? 'Équipe' : 'Équipes'],
          ].map(([n, l]) => (
            <View key={String(l)} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={st.statNum}>{n}</Text>
              <Text style={st.statLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </Hero>

      {!user.email_verified ? (
        <Banner icon="mail-unread-outline" title="Confirme ton e-mail" text="Entre le code reçu pour sécuriser ton compte." onPress={() => router.push('/verify')} />
      ) : null}

      {pub?.teams?.length ? (
        <>
          <Kicker>Mes équipes</Kicker>
          <View style={[s.row, { flexWrap: 'wrap', gap: 12 }]}>
            {pub.teams.map((t, i) => (
              <FadeIn key={t.id} index={i}>
                <Pressable onPress={() => router.push(`/team/${t.id}`)} style={{ alignItems: 'center', gap: 4, width: 76 }}>
                  <TeamCrest name={t.name} logo={t.logo_url} primary={t.color_primary} secondary={t.color_secondary} size={56} />
                  <Text style={st.teamName} numberOfLines={1}>
                    {t.name}
                  </Text>
                </Pressable>
              </FadeIn>
            ))}
          </View>
        </>
      ) : null}

      {user.suspended_until ? (
        <ErrorText>{`Ton compte est suspendu jusqu'au ${new Date(user.suspended_until).toLocaleDateString('fr-FR')}${user.suspended_reason ? ` (${user.suspended_reason})` : ''}. Tu peux consulter l'appli, mais pas publier ni organiser.`}</ErrorText>
      ) : null}
      <GradeCard grade={user.grade ?? pub?.grade} />

      <Kicker>Mes prochains matchs</Kicker>
      {matches.length ? matches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />) : <Text style={s.sub}>Aucun match prévu. Va voir l'onglet Matchs !</Text>}

      <Kicker>Personnaliser</Kicker>
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
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>
      <Button title="Enregistrer" onPress={save} loading={saving} />
      <Button title="Voir mon profil public" variant="ghost" icon="eye-outline" onPress={() => router.push(`/user/${user.id}`)} />

      {user.site_role === 'moderator' || user.site_role === 'admin' ? (
        <>
          <Kicker>{user.site_role === 'admin' ? 'Administration' : 'Modération'}</Kicker>
          <Button title="Ouvrir la modération" icon="shield-checkmark-outline" variant="dark" onPress={() => router.push('/moderation')} />
        </>
      ) : null}

      <Kicker>Paiements</Kicker>
      <Button title="Encaisser mes matchs payants" icon="card-outline" variant="dark" onPress={() => router.push('/payouts')} />

      <Kicker>Sécurité</Kicker>
      <Button title="Changer mon mot de passe" variant="dark" icon="lock-closed-outline" onPress={() => router.push('/password')} />
      <Button title="Se déconnecter" variant="ghost" onPress={logout} />
    </Screen>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: -4 },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.chalk },
  name: { ...font.extrabold, fontSize: 24, lineHeight: 30, color: colors.chalk },
  bio: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.chalk },
  shirt: { alignItems: 'center', justifyContent: 'center' },
  shirtNum: { ...font.black, position: 'absolute', top: 12, fontSize: 17, color: colors.chalk },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,248,241,.3)' },
  statNum: { ...font.black, fontSize: 22, color: colors.chalk },
  statLabel: { ...font.medium, fontSize: 11, color: colors.chalk, opacity: 0.85 },
  teamName: { ...font.semibold, fontSize: 12, color: colors.ink, textAlign: 'center' },
});
