// Sur ordinateur, l'appli web s'affiche dans une colonne centrée, à la largeur d'un grand téléphone.
import { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from './ui';

/** Largeur maximale de l'appli (et des feuilles qui montent du bas de l'écran) sur grand écran. */
export const APP_WIDTH = 520;

/** Style à ajouter aux feuilles des fenêtres modales pour qu'elles restent dans la colonne. */
export const sheetWidth = { width: '100%', maxWidth: APP_WIDTH, alignSelf: 'center' } as const;

export function WebFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= APP_WIDTH + 40) return <>{children}</>;
  return (
    <View style={st.outer}>
      <View style={st.column}>{children}</View>
    </View>
  );
}

const st = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', backgroundColor: colors.night },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: APP_WIDTH,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,248,241,.08)',
    boxShadow: '0 0 60px rgba(0,0,0,.35)',
  },
});
