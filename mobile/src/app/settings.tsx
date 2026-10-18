// Réglages : modération, espace pro, notifications, sécurité, informations légales, déconnexion.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { NotificationSettings } from '../components/NotificationSettings';
import { Button, colors, font, Kicker, s, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  if (!user) return null;
  return (
    <Screen>
      {user.site_role === 'moderator' || user.site_role === 'admin' ? (
        <>
          <Kicker>{user.site_role === 'admin' ? 'Administration' : 'Modération'}</Kicker>
          <Button title="Ouvrir la modération" icon="shield-checkmark-outline" variant="dark" onPress={() => router.push('/moderation')} />
        </>
      ) : null}

      <Kicker>Espace pro</Kicker>
      <Text style={s.sub}>Tu gères un five, un club, une association ? Publie des créneaux et des tournois payants.</Text>
      <Button title="Ouvrir mon espace pro" icon="briefcase-outline" variant="dark" onPress={() => router.push('/pro')} />

      <Kicker>Notifications</Kicker>
      <NotificationSettings user={user} onChange={setUser} />

      <Kicker>Sécurité</Kicker>
      <Button title="Changer mon mot de passe" variant="dark" icon="lock-closed-outline" onPress={() => router.push('/password')} />
      <Button title="Se déconnecter" variant="ghost" onPress={logout} />
      <View style={[s.row, { justifyContent: 'center', gap: 18 }]}>
        <Text style={st.legal} onPress={() => router.push('/cgu')}>
          Conditions d'utilisation
        </Text>
        <Text style={st.legal} onPress={() => router.push('/mentions')}>
          Mentions légales
        </Text>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  legal: { ...font.medium, fontSize: 12.5, color: colors.dim, textDecorationLine: 'underline' },
});
