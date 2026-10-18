// Menu déroulant : un champ qui affiche le choix actuel et ouvre la liste des valeurs possibles en bas de l'écran.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, Label, s } from './ui';
import { sheetWidth } from './WebFrame';

export type SelectOption<T> = { value: T; label: string; hint?: string };

const ROW = 52;

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  title,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  /** Titre de la liste, si différent du libellé du champ. */
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const current = options.find((o) => o.value === value);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  // La liste s'ouvre sur la valeur choisie.
  useEffect(() => {
    if (open) setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, (index - 2) * ROW), animated: false }), 0);
  }, [open, index]);

  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${current?.label ?? ''}. Changer`}
        style={({ pressed }) => [st.field, pressed && { borderColor: colors.orange2 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={st.value}>{current?.label ?? '—'}</Text>
          {current?.hint ? <Text style={s.sub}>{current.hint}</Text> : null}
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.dim} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Fermer" />
        <View style={[st.sheet, sheetWidth, { paddingBottom: insets.bottom + 12 }]}>
          <View style={st.grabber} />
          <Text style={st.title}>{title ?? label}</Text>
          <ScrollView ref={scroll} style={{ maxHeight: ROW * 7 }}>
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Pressable
                  key={String(o.value)}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [st.row, on && st.rowOn, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.rowText, on && { color: colors.orange2 }]}>{o.label}</Text>
                    {o.hint ? <Text style={st.rowHint}>{o.hint}</Text> : null}
                  </View>
                  {on ? <Ionicons name="checkmark" size={20} color={colors.orange2} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 12 },
  value: { ...font.bold, fontSize: 17, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,23,.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  title: { ...font.extrabold, fontSize: 20, color: colors.ink, paddingHorizontal: 4 },
  row: { minHeight: ROW, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 14 },
  rowOn: { backgroundColor: colors.tint },
  rowText: { ...font.semibold, fontSize: 16, color: colors.ink },
  rowHint: { ...font.regular, fontSize: 12.5, color: colors.dim },
});
