// Choix d'une couleur : pastilles rondes, la sélection est entourée.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Gradient } from './brand';
import { colors } from './ui';

export function Swatches<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; stops: readonly [string, string, ...string[]]; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={{ padding: 3, borderRadius: 24, borderWidth: 2, borderColor: on ? colors.ink : 'transparent' }}
          >
            <Gradient colors={o.stops} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,.08)' }}>
              {on ? <Ionicons name="checkmark" size={18} color={o.stops[0].toLowerCase() === '#ffffff' ? colors.night : colors.chalk} /> : null}
            </Gradient>
          </Pressable>
        );
      })}
    </View>
  );
}

// Couleurs proposées aux équipes (maillot principal et secondaire).
export const TEAM_COLORS = [
  { value: '#ff5223', label: 'Orange' },
  { value: '#ff9417', label: 'Ambre' },
  { value: '#e53935', label: 'Rouge' },
  { value: '#8e1b3a', label: 'Bordeaux' },
  { value: '#ec407a', label: 'Rose' },
  { value: '#7e57c2', label: 'Violet' },
  { value: '#1e88e5', label: 'Bleu' },
  { value: '#0d2c6b', label: 'Marine' },
  { value: '#29b6f6', label: 'Ciel' },
  { value: '#2e9d4f', label: 'Vert' },
  { value: '#c0ca33', label: 'Citron' },
  { value: '#fdd835', label: 'Jaune' },
  { value: '#1f1a17', label: 'Noir' },
  { value: '#9e9e9e', label: 'Gris' },
  { value: '#ffffff', label: 'Blanc' },
];
