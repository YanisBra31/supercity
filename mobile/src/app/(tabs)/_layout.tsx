import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { colors } from '../../components/ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} color={color as string} size={size} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.orange2,
        tabBarInactiveTintColor: colors.dim,
        headerStyle: { backgroundColor: colors.orange2 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Matchs', tabBarIcon: icon('football-outline') }} />
      <Tabs.Screen name="create" options={{ title: 'Organiser', tabBarIcon: icon('add-circle-outline') }} />
      <Tabs.Screen name="teams" options={{ title: 'Équipes', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
