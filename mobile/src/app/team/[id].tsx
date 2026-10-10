// Détail d'une équipe : code d'invitation, joueurs, départ.
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Share, Text, View } from 'react-native';
import { Button, Card, colors, ErrorText, Label, Loading, Pill, s, Screen } from '../../components/ui';
import { ApiError, del, get, post, Team } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatLabel, levelLabel, POSITIONS } from '../../lib/format';

function ask(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Non', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Oui', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeam(await get<Team>(`/teams/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Équipe introuvable.');
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after ? after() : load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible.');
    }
  };

  if (!team) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;
  const captain = team.my_role === 'captain';

  return (
    <Screen>
      <Stack.Screen options={{ title: team.name }} />
      <Text style={s.sub}>
        {team.members_count} joueur{team.members_count > 1 ? 's' : ''}
        {team.city ? ` · ${team.city}` : ''}
        {team.usual_format ? ` · ${formatLabel(team.usual_format)}` : ''}
      </Text>

      {team.invite_code ? (
        <Card style={{ backgroundColor: colors.night, borderColor: colors.night }}>
          <Text style={{ color: colors.white, opacity: 0.8, fontWeight: '600' }}>Code d'invitation</Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(team.invite_code!);
              setCopied(true);
            }}
          >
            <Text style={{ color: colors.orange1, fontSize: 32, fontWeight: '900', letterSpacing: 4 }}>{team.invite_code}</Text>
          </Pressable>
          <Text style={{ color: colors.white, opacity: 0.8 }}>{copied ? 'Copié !' : 'Touche le code pour le copier.'}</Text>
          <Button
            title="Inviter des joueurs"
            icon="share-social-outline"
            onPress={() =>
              Share.share({ message: `Rejoins ${team.name} sur Supercity avec le code ${team.invite_code}` })
            }
          />
          {captain ? (
            <Text style={{ color: colors.white, opacity: 0.7, textAlign: 'center' }} onPress={() => act(() => post(`/teams/${team.id}/invite-code`))}>
              Générer un nouveau code
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Label>Joueurs</Label>
      {team.members?.map((m) => (
        <Card key={m.id} style={{ paddingVertical: 12 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontWeight: '700', fontSize: 16, flex: 1 }}>{m.display_name}</Text>
            {m.role === 'captain' ? <Pill text="Capitaine" /> : null}
          </View>
          <Text style={s.sub}>
            {[POSITIONS.find((p) => p.value === m.position)?.label, m.level ? levelLabel(m.level) : null].filter(Boolean).join(' · ') || 'Profil à compléter'}
          </Text>
          {captain && m.id !== user?.id ? (
            <View style={[s.row, { gap: 16 }]}>
              <Text
                style={{ color: colors.orange2, fontWeight: '600' }}
                onPress={async () => {
                  if (await ask('Passer le brassard ?', `${m.display_name} deviendra capitaine.`)) act(() => post(`/teams/${team.id}/captain`, { user_id: m.id }));
                }}
              >
                Nommer capitaine
              </Text>
              <Text
                style={{ color: colors.danger, fontWeight: '600' }}
                onPress={async () => {
                  if (await ask('Retirer ce joueur ?', `${m.display_name} ne fera plus partie de l'équipe.`)) act(() => del(`/teams/${team.id}/members/${m.id}`));
                }}
              >
                Retirer
              </Text>
            </View>
          ) : null}
        </Card>
      ))}

      <ErrorText>{error}</ErrorText>
      {team.my_role ? (
        <Button
          title="Quitter l'équipe"
          variant="danger"
          onPress={async () => {
            const alone = team.members_count === 1;
            if (await ask("Quitter l'équipe ?", alone ? "Tu es le dernier joueur : l'équipe sera supprimée." : 'Tu pourras revenir avec le code.'))
              act(() => del(`/teams/${team.id}/members/me`), () => router.back());
          }}
        />
      ) : null}
    </Screen>
  );
}
