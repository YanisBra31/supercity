import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { get } from '../../lib/api';
import { ColorValue, View } from 'react-native';
import { brand } from '../../components/brand';
import { colors, font } from '../../components/ui';
import { header } from '../../components/header';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon =
  (off: IconName, on: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Ionicons name={focused ? on : off} color={color as string} size={22} />
      <View style={{ width: focused ? 16 : 0, height: 3, borderRadius: 2, backgroundColor: brand.orange2 }} />
    </View>
  );

// Barre d'onglets nuit, comme le pied de page du site.
export default function TabsLayout() {
  // Pastille sur l'onglet Équipes : défis reçus qui attendent une réponse.
  const [pending, setPending] = useState(0);
  const path = usePathname();
  useEffect(() => {
    get<{ received: { can_respond: boolean }[] }>('/me/challenges')
      .then((r) => setPending(r.received.filter((c) => c.can_respond).length))
      .catch(() => undefined);
  }, [path]);
  return (
    <Tabs
      screenOptions={{
        ...header,
        headerShown: false,
        tabBarActiveTintColor: brand.orange1,
        tabBarInactiveTintColor: 'rgba(255,248,241,.55)',
        tabBarStyle: { backgroundColor: colors.night, borderTopWidth: 0, height: 66, paddingTop: 8 },
        tabBarLabelStyle: { ...font.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Matchs', tabBarIcon: icon('football-outline', 'football') }} />
      <Tabs.Screen name="feed" options={{ title: 'Fil', tabBarIcon: icon('newspaper-outline', 'newspaper') }} />
      <Tabs.Screen name="create" options={{ title: 'Organiser', tabBarIcon: icon('add-circle-outline', 'add-circle') }} />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Équipes',
          tabBarIcon: icon('people-outline', 'people'),
          tabBarBadge: pending || undefined,
          tabBarBadgeStyle: { backgroundColor: brand.orange2, color: colors.chalk, ...font.bold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
