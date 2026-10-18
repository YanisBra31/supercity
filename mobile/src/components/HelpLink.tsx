// Lien discret vers une question de la page Aide, à la place d'un long texte d'explication.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { colors, font } from './ui';

export function HelpLink({ q, children, center }: { q: string; children: string; center?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/help', params: { q } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: center ? 'center' : 'flex-start' }}
    >
      <Ionicons name="help-circle-outline" size={16} color={colors.orange2} />
      <Text style={{ ...font.semibold, fontSize: 13, color: colors.orange2 }}>{children}</Text>
    </Pressable>
  );
}
