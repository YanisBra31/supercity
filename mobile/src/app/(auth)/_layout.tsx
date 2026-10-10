import { Stack } from 'expo-router';
import { colors } from '../../components/ui';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
        title: '',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
