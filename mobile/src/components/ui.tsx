// Briques d'interface aux couleurs de Supercity (charte du site : Poppins, dégradé orange, nuit, craie).
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentProps, ReactNode, useState } from 'react';
import {
  Appearance,
  Image,
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
import { AccentName, BallLoader, BouncingBall, brand, FadeIn, Gradient } from './brand';

// Mode sombre : suit le réglage du téléphone au lancement de l'appli. Le dégradé orange, la nuit et la craie ne changent pas ;
// seuls les fonds, les cartes, les traits et le texte courant s'inversent. « white » est la couleur des cartes.
export const isDark = Appearance.getColorScheme() === 'dark';

export const colors = {
  orange1: brand.orange1,
  orange2: brand.orange2,
  night: brand.night,
  night2: brand.night2,
  chalk: brand.chalk,
  ...(isDark
    ? {
        ink: '#f4ebe3',
        dim: '#b3a59a',
        line: '#3a302b',
        tint: '#2c231f',
        bg: '#141110',
        white: '#221c19',
        danger: '#ff6b5b',
        success: '#5cc068',
        successBg: '#1d2e1f',
        dangerBg: '#3a1d19',
        greyBg: '#2e2723',
      }
    : {
        ink: '#1f1a17',
        dim: '#5c524c',
        line: '#f0dccb',
        tint: '#fff1e4',
        bg: '#fff8f1',
        white: '#ffffff',
        danger: '#c62828',
        success: '#2e7d32',
        successBg: '#e7f4e8',
        dangerBg: '#fdecea',
        greyBg: '#efe9e4',
      }),
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
export function Screen({ children, scroll = true, top = false, footer }: { children: ReactNode; scroll?: boolean; top?: boolean; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const pad = top ? { paddingTop: insets.top + 12 } : null;
  if (!scroll) return <View style={[s.screen, pad]}>{children}</View>;
  const body = (
    <ScrollView style={s.screenBg} contentContainerStyle={[s.screen, pad]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
  if (!footer) return body;
  // Action principale fixée en bas de l'écran, toujours visible.
  return (
    <View style={s.screenBg}>
      {body}
      {/* Dans un onglet (top), la barre d'onglets protège déjà le bas de l'écran. */}
      <View style={[s.dock, { paddingBottom: top ? 12 : Math.max(insets.bottom, 12) }]}>{footer}</View>
    </View>
  );
}

/** En-tête d'onglet compact : sur-titre, titre, sous-titre, et une action à droite. */
export function PageHeader({ kicker, title, sub, right }: { kicker?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {kicker ? <Text style={[s.kicker, { color: colors.orange2 }]}>{kicker}</Text> : null}
        <Text style={s.pageTitle} numberOfLines={2}>
          {title}
        </Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Bouton rond à icône (bascule carte, réglages...). */
export function IconButton({ icon, label, onPress, dark }: { icon: IconName; label: string; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [s.iconBtn, dark && { backgroundColor: colors.night, borderColor: colors.night }, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Ionicons name={icon} size={20} color={dark ? colors.chalk : colors.ink} />
    </Pressable>
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
            variant === 'dark' && { backgroundColor: isDark ? colors.night2 : colors.night },
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
    <View style={[s.errorBox, { backgroundColor: colors.successBg }]}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      <Text style={[s.error, { flex: 1, color: colors.success }]}>{children}</Text>
    </View>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  /** Le prochain pas à faire, pour ne jamais laisser un écran vide sans issue. */
  action?: { title: string; icon?: IconName; onPress: () => void };
}) {
  return (
    <FadeIn style={s.empty}>
      {icon ? (
        <Gradient style={s.emptyIcon}>
          <Ionicons name={icon} size={30} color={colors.chalk} />
        </Gradient>
      ) : null}
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={[s.sub, { textAlign: 'center', maxWidth: 300 }]}>{text}</Text> : null}
      {action ? <Button title={action.title} icon={action.icon} variant="dark" onPress={action.onPress} style={{ marginTop: 6, alignSelf: 'center' }} /> : null}
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

export function Pill({ text, tone = 'orange', icon }: { text: string; tone?: 'orange' | 'dark' | 'green' | 'grey'; icon?: IconName }) {
  const bg = { orange: colors.tint, dark: colors.night, green: colors.successBg, grey: colors.greyBg }[tone];
  const fg = { orange: colors.orange2, dark: colors.chalk, green: colors.success, grey: colors.dim }[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }, icon && { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[s.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

// Pastille ronde : photo du joueur si elle existe, sinon initiale sur dégradé.
export function Avatar({
  name,
  size = 44,
  tone = 'orange',
  uri,
  ring,
}: {
  name: string;
  size?: number;
  tone?: 'orange' | 'night' | AccentName;
  uri?: string | null;
  ring?: boolean;
}) {
  const border = ring ? { borderWidth: 3, borderColor: colors.chalk } : null;
  if (uri) {
    return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.tint }, border]} />;
  }
  return (
    <Gradient tone={tone} style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, border]}>
      <Text style={[font.extrabold, { color: colors.chalk, fontSize: size * 0.42, lineHeight: size * 0.56 }]}>
        {(name || '?').slice(0, 1).toUpperCase()}
      </Text>
    </Gradient>
  );
}

// Blason d'équipe : logo envoyé, sinon initiales aux couleurs de l'équipe.
export function TeamCrest({
  name,
  logo,
  primary = colors.orange2,
  secondary = colors.night,
  size = 50,
}: {
  name: string;
  logo?: string | null;
  primary?: string;
  secondary?: string;
  size?: number;
}) {
  const r = size * 0.3;
  if (logo) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
        <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <Gradient colors={[primary, primary, secondary]} style={{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[font.black, { color: readableOn(primary), fontSize: size * 0.34, lineHeight: size * 0.46 }]}>{initials || '?'}</Text>
    </Gradient>
  );
}

// Texte lisible (craie ou nuit) sur une couleur de fond donnée.
export function readableOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? colors.night : colors.chalk;
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
  pageTitle: { ...font.black, fontSize: 34, lineHeight: 40, color: colors.ink, letterSpacing: -1.2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  dock: { paddingHorizontal: 20, paddingTop: 12, gap: 8, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
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
  inputFocus: { borderColor: colors.orange2, backgroundColor: colors.white },
  inputText: { ...font.regular, flex: 1, minWidth: 0, width: '100%', fontSize: 15, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' } as never,
  error: { ...font.medium, color: colors.danger, fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 10 },
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

// Bandeau d'alerte cliquable (ex. : e-mail à confirmer).
export function Banner({ icon, title, text, onPress }: { icon: IconName; title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Gradient tone="night" style={{ borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={24} color={colors.orange1} />
        <View style={{ flex: 1 }}>
          <Text style={[font.bold, { color: colors.chalk, fontSize: 14 }]}>{title}</Text>
          <Text style={[font.regular, { color: colors.chalk, opacity: 0.75, fontSize: 12 }]}>{text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.chalk} />
      </Gradient>
    </Pressable>
  );
}
