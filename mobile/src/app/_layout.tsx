import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Splash } from '../components/brand';
import { header } from '../components/header';
import { colors } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';

function RootStack() {
  const { user } = useAuth();
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
        <Stack.Screen name="verify" options={{ title: 'Confirmation' }} />
        <Stack.Screen name="password" options={{ title: 'Mot de passe', presentation: 'modal' }} />
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
