// Briques d'interface aux couleurs de Supercity (charte du site : Poppins, dégradé orange, nuit, craie).
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentProps, ReactNode, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BallLoader, BouncingBall, brand, FadeIn, Gradient } from './brand';

export const colors = {
  orange1: brand.orange1,
  orange2: brand.orange2,
  night: brand.night,
  night2: brand.night2,
  chalk: brand.chalk,
  ink: '#1f1a17',
  dim: '#5c524c',
  line: '#f0dccb',
  tint: '#fff1e4',
  bg: '#fff8f1',
  white: '#ffffff',
  danger: '#c62828',
  success: '#2e7d32',
};

export const font = {
  regular: { fontFamily: 'Poppins_400Regular' },
  medium: { fontFamily: 'Poppins_500Medium' },
  semibold: { fontFamily: 'Poppins_600SemiBold' },
  bold: { fontFamily: 'Poppins_700Bold' },
  extrabold: { fontFamily: 'Poppins_800ExtraBold' },
  black: { fontFamily: 'Poppins_900Black' },
} as const;

type IconName = ComponentProps<typeof Ionicons>['name'];

const tap = () => {
  Haptics.selectionAsync().catch(() => undefined);
};

// `top` : écran sans en-tête, on décale sous la barre d'état.
export function Screen({ children, scroll = true, top = false }: { children: ReactNode; scroll?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = top ? { paddingTop: insets.top + 12 } : null;
  if (!scroll) return <View style={[s.screen, pad]}>{children}</View>;
  return (
    <ScrollView style={s.screenBg} contentContainerStyle={[s.screen, pad]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

// Sur-titre orange en capitales espacées, comme les « kickers » du site.
export function Kicker({ children, color = colors.orange2 }: { children: ReactNode; color?: string }) {
  return <Text style={[s.kicker, { color }]}>{children}</Text>;
}

export function Title({ children, sub, kicker }: { children: ReactNode; sub?: string; kicker?: string }) {
  return (
    <FadeIn style={{ gap: 4 }}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <Text style={s.title}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </FadeIn>
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
  icon?: IconName;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: ButtonProps) {
  const fg = variant === 'ghost' ? colors.orange2 : variant === 'danger' ? colors.danger : colors.chalk;
  const content = loading ? (
    <View style={{ height: 30, justifyContent: 'center' }}>
      <BouncingBall size={14} ink={variant === 'ghost' ? colors.orange2 : colors.night} />
    </View>
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.buttonWrap,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <Gradient style={[s.button, s.buttonShadow]}>{content}</Gradient>
      ) : (
        <View
          style={[
            s.button,
            variant === 'dark' && { backgroundColor: colors.night },
            variant !== 'dark' && s.buttonGhost,
            variant === 'light' && { borderColor: colors.chalk },
            variant === 'danger' && { borderColor: colors.danger },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  hint,
  secureTextEntry,
  style,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: ReactNode }) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <View style={[s.input, focus && s.inputFocus, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          placeholderTextColor="#a59a92"
          style={[s.inputText, style]}
          secureTextEntry={secureTextEntry && hidden}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
            hitSlop={10}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.dim} />
          </Pressable>
        ) : null}
      </View>
      {hint}
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
      {options.map((o) => (
        <Chip
          key={String(o.value)}
          label={o.label}
          on={o.value === value}
          onPress={() => onChange(o.value === value && allowEmpty ? null : o.value)}
        />
      ))}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}
    >
      {on ? (
        <Gradient style={[s.chip, s.chipOn]}>
          <Text style={[s.chipText, { color: colors.chalk }]}>{label}</Text>
        </Gradient>
      ) : (
        <View style={s.chip}>
          <Text style={s.chipText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
  style,
  index,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  index?: number;
}) {
  const body = !onPress ? (
    <View style={[s.card, style]}>{children}</View>
  ) : (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.985 }], borderColor: colors.orange1 }, style]}
    >
      {children}
    </Pressable>
  );
  return index === undefined ? body : <FadeIn index={index}>{body}</FadeIn>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={[s.error, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

export function Success({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <View style={[s.errorBox, { backgroundColor: '#e7f4e8' }]}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      <Text style={[s.error, { flex: 1, color: colors.success }]}>{children}</Text>
    </View>
  );
}

export function Empty({ icon, title, text }: { icon?: IconName; title: string; text?: string }) {
  return (
    <FadeIn style={s.empty}>
      {icon ? (
        <Gradient style={s.emptyIcon}>
          <Ionicons name={icon} size={30} color={colors.chalk} />
        </Gradient>
      ) : null}
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={[s.sub, { textAlign: 'center', maxWidth: 300 }]}>{text}</Text> : null}
    </FadeIn>
  );
}

export function Loading() {
  return (
    <View style={[s.empty, { flex: 1, backgroundColor: colors.bg }]}>
      <BallLoader size={96} onDark={false} />
    </View>
  );
}

export function Pill({ text, tone = 'orange' }: { text: string; tone?: 'orange' | 'dark' | 'green' | 'grey' }) {
  const bg = { orange: colors.tint, dark: colors.night, green: '#e7f4e8', grey: '#efe9e4' }[tone];
  const fg = { orange: colors.orange2, dark: colors.chalk, green: colors.success, grey: colors.dim }[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

// Pastille ronde avec initiale (joueurs, équipes).
export function Avatar({ name, size = 44, tone = 'orange' }: { name: string; size?: number; tone?: 'orange' | 'night' }) {
  return (
    <Gradient tone={tone} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[font.extrabold, { color: colors.chalk, fontSize: size * 0.42, lineHeight: size * 0.56 }]}>
        {(name || '?').slice(0, 1).toUpperCase()}
      </Text>
    </Gradient>
  );
}

// Ligne icône + texte.
export function Meta({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={16} color={colors.orange2} />
      <Text style={[s.sub, { flex: 1 }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: colors.bg },
  screen: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 16 },
  kicker: { ...font.semibold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { ...font.extrabold, fontSize: 30, lineHeight: 38, color: colors.ink, letterSpacing: -0.6 },
  sub: { ...font.regular, fontSize: 14, color: colors.dim, lineHeight: 21 },
  label: { ...font.semibold, fontSize: 11, color: colors.ink, textTransform: 'uppercase', letterSpacing: 1.6 },
  buttonWrap: { borderRadius: 999 },
  button: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonShadow: {
    shadowColor: colors.orange2,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.orange2 },
  buttonText: { ...font.bold, fontSize: 15, letterSpacing: 0.2 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputFocus: { borderColor: colors.orange2, backgroundColor: '#fffdfb' },
  inputText: { ...font.regular, flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' } as never,
  error: { ...font.medium, color: colors.danger, fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fdecea', borderRadius: 12, padding: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipOn: { borderColor: 'transparent' },
  chipText: { ...font.semibold, fontSize: 13, color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { ...font.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { ...font.semibold, fontSize: 11, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
