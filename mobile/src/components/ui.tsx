// Briques d'interface aux couleurs de Supercity.
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

export const colors = {
  orange1: '#ff9417',
  orange2: '#ff5223',
  night: '#1f1a17',
  ink: '#1f1a17',
  dim: '#6b625c',
  line: '#f0dccb',
  tint: '#fff1e4',
  bg: '#fffaf5',
  white: '#ffffff',
  danger: '#c62828',
  success: '#2e7d32',
};

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={s.screen}>{children}</View>;
  return (
    <ScrollView style={s.screenBg} contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.title}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'light';
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: ButtonProps) {
  const fg = variant === 'ghost' ? colors.orange2 : variant === 'danger' ? colors.danger : colors.white;
  // 'light' : contour blanc, pour les fonds orange.
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        variant === 'primary' && { backgroundColor: colors.orange2 },
        variant === 'dark' && { backgroundColor: colors.night },
        (variant === 'ghost' || variant === 'danger' || variant === 'light') && s.buttonGhost,
        variant === 'light' && { borderColor: colors.white },
        variant === 'danger' && { borderColor: colors.danger },
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor="#a59a92"
        style={[s.input, error ? { borderColor: colors.danger } : null]}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  allowEmpty,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  allowEmpty?: boolean;
}) {
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(on && allowEmpty ? null : o.value)}
            style={[s.chip, on && s.chipOn]}
          >
            <Text style={[s.chipText, on && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }, style]}>
      {children}
    </Pressable>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={[s.error, { textAlign: 'center' }]}>{children}</Text>;
}

export function Empty({ icon, title, text }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; text?: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={40} color={colors.orange2} />
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={s.sub}>{text}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={[s.empty, { flex: 1 }]}>
      <ActivityIndicator size="large" color={colors.orange2} />
    </View>
  );
}

export function Pill({ text, tone = 'orange' }: { text: string; tone?: 'orange' | 'dark' | 'green' | 'grey' }) {
  const bg = { orange: colors.tint, dark: colors.night, green: '#e7f4e8', grey: '#eee' }[tone];
  const fg = { orange: colors.orange2, dark: colors.white, green: colors.success, grey: colors.dim }[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: colors.bg },
  screen: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: colors.dim, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.6 },
  button: {
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.orange2 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.orange2, borderColor: colors.orange2 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
