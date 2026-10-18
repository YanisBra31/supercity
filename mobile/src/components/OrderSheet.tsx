// Récapitulatif avant tout achat (règle du « double clic », art. 1127-2 du Code civil) :
// le joueur voit ce qu'il achète et le prix total, peut revenir en arrière, puis confirme.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, font } from './ui';

export type OrderLine = { label: string; value: string };

export function OrderSheet({
  visible,
  title,
  lines,
  total,
  notes = [],
  help,
  confirm,
  icon = 'card-outline',
  busy,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  lines: OrderLine[];
  total: OrderLine;
  notes?: string[];
  /** Question de la page Aide à proposer sous le récapitulatif. */
  help?: string;
  confirm: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const go = (to: Parameters<typeof router.push>[0]) => {
    onClose();
    router.push(to);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.grabber} />
        <Text style={st.kicker}>Vérifie avant de confirmer</Text>
        <Text style={st.title}>{title}</Text>
        <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={st.box}>
            {lines.map((l) => (
              <View key={l.label} style={st.line}>
                <Text style={st.label}>{l.label}</Text>
                <Text style={st.value}>{l.value}</Text>
              </View>
            ))}
            <View style={[st.line, st.totalLine]}>
              <Text style={st.totalLabel}>{total.label}</Text>
              <Text style={st.totalValue}>{total.value}</Text>
            </View>
          </View>
          {notes.map((n) => (
            <Text key={n} style={st.note}>
              {n}
            </Text>
          ))}
          <View style={st.links}>
            {help ? (
              <Pressable accessibilityRole="link" onPress={() => go({ pathname: '/help', params: { q: help } })}>
                <Text style={st.link}>Questions fréquentes</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="link" onPress={() => go('/cgu')}>
              <Text style={st.link}>Conditions d'utilisation</Text>
            </Pressable>
          </View>
        </ScrollView>
        <Button title={confirm} icon={icon} loading={busy} onPress={onConfirm} />
        <Button title="Modifier" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,23,.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 12, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  kicker: { ...font.semibold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.orange2 },
  title: { ...font.extrabold, fontSize: 22, color: colors.ink, marginTop: -6 },
  box: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 9 },
  label: { ...font.medium, fontSize: 14, color: colors.dim, flexShrink: 0 },
  value: { ...font.semibold, fontSize: 14, color: colors.ink, flex: 1, textAlign: 'right' },
  totalLine: { borderTopWidth: 1.5, borderTopColor: colors.line, marginTop: 4, paddingTop: 12 },
  totalLabel: { ...font.bold, fontSize: 16, color: colors.ink },
  totalValue: { ...font.black, fontSize: 22, color: colors.ink },
  note: { ...font.medium, fontSize: 13, lineHeight: 19, color: colors.dim },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  link: { ...font.semibold, fontSize: 13, color: colors.orange2, textDecorationLine: 'underline' },
});
