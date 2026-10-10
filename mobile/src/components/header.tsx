// Options d'en-tête partagées : dégradé orange, titre en Poppins.
import { StyleSheet } from 'react-native';
import { Gradient } from './brand';
import { colors, font } from './ui';

export const header = {
  headerTintColor: colors.chalk,
  headerBackground: () => <Gradient style={StyleSheet.absoluteFill} />,
  headerTitleStyle: { ...font.extrabold, fontSize: 18 },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
};
