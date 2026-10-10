// Champs de formulaire spécifiques : jauge de mot de passe, case à cocher, date de naissance, code à 6 chiffres.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { passwordRules, passwordScore, SCORE_LABELS } from '../lib/password';
import { brand, Gradient } from './brand';
import { colors, font, Label, s } from './ui';

const SCORE_COLORS = ['#c62828', '#e65100', brand.orange1, brand.orange2, '#2e7d32'];

export function PasswordMeter({ password, personal }: { password: string; personal: string[] }) {
  const score = passwordScore(password, personal);
  const rules = passwordRules(password, personal);
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: password ? (score + 1) / 5 : 0, duration: 300, useNativeDriver: false }).start();
  }, [w, score, password]);
  if (!password) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View style={st.track}>
          <Animated.View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: SCORE_COLORS[score],
              width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          />
        </View>
        <Text style={[st.score, { color: SCORE_COLORS[score] }]}>{SCORE_LABELS[score]}</Text>
      </View>
      <View style={{ gap: 3 }}>
        {rules.map((r) => (
          <View key={r.label} style={s.row}>
            <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={r.ok ? colors.success : '#b8aca3'} />
            <Text style={[st.rule, r.ok && { color: colors.success }]}>{r.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Checkbox({ checked, onChange, error, children }: { checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={[s.row, { alignItems: 'flex-start', gap: 12 }]}
      >
        {checked ? (
          <Gradient style={st.box}>
            <Ionicons name="checkmark" size={16} color={colors.chalk} />
          </Gradient>
        ) : (
          <View style={[st.box, st.boxOff, error ? { borderColor: colors.danger } : null]} />
        )}
        <Text style={[s.sub, { flex: 1, color: colors.ink }]}>{children}</Text>
      </Pressable>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

// Date de naissance en trois cases JJ / MM / AAAA ; renvoie AAAA-MM-JJ (ou '' si incomplète).
export function BirthDateField({ value, onChange, error }: { value: string; onChange: (iso: string) => void; error?: string }) {
  const [d, setD] = useState(value ? value.slice(8, 10) : '');
  const [m, setM] = useState(value ? value.slice(5, 7) : '');
  const [y, setY] = useState(value ? value.slice(0, 4) : '');
  const mRef = useRef<TextInput>(null);
  const yRef = useRef<TextInput>(null);
  useEffect(() => {
    onChange(d.length === 2 && m.length === 2 && y.length === 4 ? `${y}-${m}-${d}` : '');
  }, [d, m, y, onChange]);
  const digits = (t: string) => t.replace(/\D/g, '');
  const box = (props: { value: string; placeholder: string; max: number; flex: number; onText: (t: string) => void; refObj?: React.RefObject<TextInput | null>; label: string }) => (
    <View style={[s.input, { flex: props.flex }, error ? { borderColor: colors.danger } : null]}>
      <TextInput
        ref={props.refObj}
        value={props.value}
        onChangeText={(t) => props.onText(digits(t).slice(0, props.max))}
        placeholder={props.placeholder}
        placeholderTextColor="#a59a92"
        keyboardType="number-pad"
        maxLength={props.max}
        accessibilityLabel={props.label}
        style={[s.inputText, { textAlign: 'center' }]}
      />
    </View>
  );
  return (
    <View style={{ gap: 6 }}>
      <Label>Date de naissance</Label>
      <View style={s.row}>
        {box({ value: d, placeholder: 'JJ', max: 2, flex: 1, label: 'Jour', onText: (t) => { setD(t); if (t.length === 2) mRef.current?.focus(); } })}
        {box({ value: m, placeholder: 'MM', max: 2, flex: 1, label: 'Mois', refObj: mRef, onText: (t) => { setM(t); if (t.length === 2) yRef.current?.focus(); } })}
        {box({ value: y, placeholder: 'AAAA', max: 4, flex: 1.6, label: 'Année', refObj: yRef, onText: setY })}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : <Text style={st.rule}>Il faut avoir au moins 15 ans. Elle n'est jamais affichée.</Text>}
    </View>
  );
}

// Code à 6 chiffres affiché en cases, avec un champ invisible par-dessus.
export function CodeField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const ref = useRef<TextInput>(null);
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => ref.current?.focus()} style={[s.row, { justifyContent: 'center', gap: 8 }]}>
        {Array.from({ length: 6 }, (_, i) => {
          const ch = value[i] ?? '';
          const active = i === value.length;
          return (
            <View key={i} style={[st.cell, active && { borderColor: colors.orange2 }, error ? { borderColor: colors.danger } : null]}>
              <Text style={st.cellText}>{ch}</Text>
            </View>
          );
        })}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          accessibilityLabel="Code à 6 chiffres"
          style={st.hidden}
        />
      </Pressable>
      {error ? <Text style={[s.error, { textAlign: 'center' }]}>{error}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden' },
  score: { ...font.semibold, fontSize: 12, minWidth: 76, textAlign: 'right' },
  rule: { ...font.regular, fontSize: 12, color: colors.dim },
  box: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOff: { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  cell: { width: 46, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cellText: { ...font.extrabold, fontSize: 24, color: colors.ink },
  hidden: { position: 'absolute', width: '100%', height: '100%', opacity: 0.01 },
});
