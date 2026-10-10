// Nouvelle publication : texte, photo, équipe citée.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Avatar, Button, Chips, colors, ErrorText, Field, font, Label, s, Screen } from '../../components/ui';
import { ApiError, createPost, get, Team } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function NewPost() {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get<{ items: Team[] }>('/me/teams').then((r) => setTeams(r.items)).catch(() => undefined);
  }, []);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled) setImage(res.assets[0]);
  };

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await createPost({ body: body.trim(), team_id: teamId }, image);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Publication impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={[s.row, { gap: 12 }]}>
        <Avatar name={user?.display_name ?? ''} uri={user?.avatar_url} tone={user?.accent} size={44} />
        <Text style={{ ...font.bold, fontSize: 16, color: colors.ink }}>{user?.display_name}</Text>
      </View>
      <Field
        label={`Ton message (${body.length}/1000)`}
        value={body}
        onChangeText={setBody}
        maxLength={1000}
        multiline
        autoFocus
        placeholder="Un résultat, une photo du match, une annonce…"
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      {image ? (
        <View>
          <Image source={{ uri: image.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: colors.tint }} />
          <Pressable onPress={() => setImage(null)} accessibilityLabel="Retirer la photo" style={{ position: 'absolute', top: 10, right: 10, backgroundColor: colors.night, borderRadius: 16, padding: 6 }}>
            <Ionicons name="close" size={18} color={colors.chalk} />
          </Pressable>
        </View>
      ) : (
        <Button title="Ajouter une photo" icon="image-outline" variant="ghost" onPress={pick} />
      )}
      {teams.length ? (
        <>
          <Label>Publier au nom de mon équipe</Label>
          <Chips options={teams.map((t) => ({ value: t.id, label: t.name }))} value={teamId} onChange={setTeamId} allowEmpty />
        </>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Button title="Publier" icon="send" onPress={submit} loading={loading} disabled={!body.trim() && !image} />
      <Text style={[s.sub, { textAlign: 'center', fontSize: 12 }]}>Reste fair-play : les publications signalées plusieurs fois sont masquées.</Text>
    </Screen>
  );
}
