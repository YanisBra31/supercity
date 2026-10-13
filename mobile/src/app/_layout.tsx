import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  useFonts,
} from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Splash } from '../components/brand';
import { header } from '../components/header';
import { colors } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { registerPush } from '../lib/push';

/** Joueur connecté : inscrit le téléphone aux alertes, et ouvre l'écran visé quand on touche une notification. */
function usePush(userId: number | null) {
  useEffect(() => {
    if (!userId) return;
    registerPush();
    if (Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    };
    // Appli lancée en touchant une notification, puis notifications touchées pendant qu'elle tourne.
    open(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [userId]);
}

function RootStack() {
  const { user } = useAuth();
  usePush(user?.id ?? null);
  return (
    <Stack screenOptions={{ ...header, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
        <Stack.Screen name="team/[id]" options={{ title: 'Équipe' }} />
        <Stack.Screen name="venue/new" options={{ title: 'Nouveau terrain', presentation: 'modal' }} />
        <Stack.Screen name="user/[id]" options={{ title: 'Joueur' }} />
        <Stack.Screen name="team/edit/[id]" options={{ title: "Personnaliser l'équipe", presentation: 'modal' }} />
        <Stack.Screen name="challenge/new" options={{ title: 'Lancer un défi', presentation: 'modal' }} />
        <Stack.Screen name="team/find" options={{ title: 'Défier une équipe' }} />
        <Stack.Screen name="post/new" options={{ title: 'Publier', presentation: 'modal' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Publication' }} />
        <Stack.Screen name="verify" options={{ title: 'Confirmation' }} />
        <Stack.Screen name="password" options={{ title: 'Mot de passe', presentation: 'modal' }} />
        <Stack.Screen name="moderation" options={{ title: 'Modération' }} />
        <Stack.Screen name="pro" options={{ title: 'Espace pro' }} />
        <Stack.Screen name="shop" options={{ title: 'Boutique' }} />
        <Stack.Screen name="org/[id]" options={{ title: 'Pro' }} />
      </Stack.Protected>
      <Stack.Screen name="cgu" options={{ title: "Conditions d'utilisation", presentation: 'modal' }} />
    </Stack>
  );
}

// Le ballon de chargement reste au moins un tour complet, puis l'écran se retire en fondu.
function Gate() {
  const { ready } = useAuth();
  const [fonts] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });
  const [minDone, setMinDone] = useState(false);
  const [gone, setGone] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const loaded = ready && fonts;

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded || !minDone) return;
    Animated.timing(fade, { toValue: 0, duration: 500, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: false }).start(() =>
      setGone(true)
    );
  }, [loaded, minDone, fade]);

  return (
    <View style={{ flex: 1 }}>
      {loaded ? <RootStack /> : null}
      {gone ? null : (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] }]}
        >
          <Splash />
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
