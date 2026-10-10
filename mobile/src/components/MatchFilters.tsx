// Filtres de la recherche de matchs : raccourcis de date, feuille de filtres, filtres actifs retirables.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Format } from '../lib/api';
import { FORMATS, LEVELS } from '../lib/format';
import { Button, Chip, Chips, colors, font, Label } from './ui';

export type When = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week';
export type Filters = {
  when: When;
  format: Format | null;
  level: number | null;
  radius: number;
  onlyOpen: boolean;
  sort: 'distance' | 'date';
};

export const DEFAULT_FILTERS: Filters = { when: 'all', format: null, level: null, radius: 15, onlyOpen: false, sort: 'distance' };
export const RADII = [5, 15, 30, 60];

const WHEN: { value: When; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'tomorrow', label: 'Demain' },
  { value: 'weekend', label: 'Ce week-end' },
  { value: 'week', label: '7 jours' },
];

/** Bornes de date envoyées à l'API pour un raccourci. */
export function whenRange(when: When): { from?: string; to?: string } {
  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };
  const iso = (d: Date) => d.toISOString();
  switch (when) {
    case 'today':
      return { from: iso(now), to: iso(day(1)) };
    case 'tomorrow':
      return { from: iso(day(1)), to: iso(day(2)) };
    case 'weekend': {
      // Samedi 0 h au lundi 0 h ; le dimanche, on garde la fin du week-end.
      const dow = now.getDay();
      const sat = day(dow === 0 ? -1 : 6 - dow);
      const mon = new Date(sat);
      mon.setDate(sat.getDate() + 2);
      return { from: iso(sat > now ? sat : now), to: iso(mon) };
    }
    case 'week':
      return { from: iso(now), to: iso(day(8)) };
    default:
      return {};
  }
}

/** Nombre de filtres de la feuille qui diffèrent des valeurs par défaut. */
export function activeCount(f: Filters, hasCoords: boolean): number {
  return [f.format !== null, f.level !== null, hasCoords && f.radius !== DEFAULT_FILTERS.radius, f.onlyOpen, hasCoords && f.sort !== 'distance'].filter(Boolean).length;
}

export function WhenBar({ value, onChange }: { value: When; onChange: (w: When) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
      {WHEN.map((w) => (
        <Chip key={w.value} label={w.label} on={value === w.value} onPress={() => onChange(w.value)} />
      ))}
    </ScrollView>
  );
}

export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Filtres${count ? `, ${count} actifs` : ''}`} style={({ pressed }) => [st.filterBtn, pressed && { opacity: 0.8 }]}>
      <Ionicons name="options-outline" size={18} color={colors.chalk} />
      <Text style={st.filterText}>Filtres</Text>
      {count ? (
        <View style={st.count}>
          <Text style={st.countText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Filtres actifs sous forme de pastilles, chacune retirable d'un geste. */
export function ActiveFilters({ f, hasCoords, onChange }: { f: Filters; hasCoords: boolean; onChange: (f: Filters) => void }) {
  const pills: { key: string; label: string; reset: Partial<Filters> }[] = [];
  if (f.format) pills.push({ key: 'format', label: FORMATS.find((x) => x.value === f.format)?.label ?? f.format, reset: { format: null } });
  if (f.level) pills.push({ key: 'level', label: LEVELS[f.level - 1], reset: { level: null } });
  if (hasCoords && f.radius !== DEFAULT_FILTERS.radius) pills.push({ key: 'radius', label: `${f.radius} km`, reset: { radius: DEFAULT_FILTERS.radius } });
  if (f.onlyOpen) pills.push({ key: 'open', label: 'Places libres', reset: { onlyOpen: false } });
  if (hasCoords && f.sort === 'date') pills.push({ key: 'sort', label: 'Par date', reset: { sort: 'distance' } });
  if (!pills.length) return null;
  return (
    <View style={st.pills}>
      {pills.map((p) => (
        <Pressable key={p.key} onPress={() => onChange({ ...f, ...p.reset })} accessibilityRole="button" accessibilityLabel={`Retirer le filtre ${p.label}`} style={st.pill}>
          <Text style={st.pillText}>{p.label}</Text>
          <Ionicons name="close" size={14} color={colors.orange2} />
        </Pressable>
      ))}
      {pills.length > 1 ? (
        <Pressable onPress={() => onChange({ ...DEFAULT_FILTERS, when: f.when })} accessibilityRole="button" style={[st.pill, { backgroundColor: 'transparent' }]}>
          <Text style={[st.pillText, { color: colors.dim }]}>Tout effacer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Feuille de filtres : on règle tout, puis on applique d'un coup. */
export function FilterSheet({
  visible,
  value,
  hasCoords,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: Filters;
  hasCoords: boolean;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Fermer les filtres" />
      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.grabber} />
        <View style={[st.sheetHead]}>
          <Text style={st.sheetTitle}>Filtres</Text>
          <Pressable onPress={() => setDraft({ ...DEFAULT_FILTERS, when: draft.when })} accessibilityRole="button">
            <Text style={st.reset}>Réinitialiser</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
          <Label>Format</Label>
          <Chips options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={draft.format} onChange={(v) => set({ format: v })} allowEmpty />
          <Label>Niveau</Label>
          <Chips options={LEVELS.map((l, i) => ({ value: i + 1, label: l }))} value={draft.level} onChange={(v) => set({ level: v })} allowEmpty />
          <Label>Distance maximum</Label>
          {hasCoords ? (
            <Chips options={RADII.map((r) => ({ value: r, label: `${r} km` }))} value={draft.radius} onChange={(v) => v && set({ radius: v })} />
          ) : (
            <Text style={st.muted}>Active la localisation pour filtrer par distance.</Text>
          )}
          {hasCoords ? (
            <>
              <Label>Trier par</Label>
              <Chips
                options={[
                  { value: 'distance', label: 'Les plus proches' },
                  { value: 'date', label: 'Les plus tôt' },
                ]}
                value={draft.sort}
                onChange={(v) => v && set({ sort: v as Filters['sort'] })}
              />
            </>
          ) : null}
          <View style={st.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.switchTitle}>Places libres uniquement</Text>
              <Text style={st.muted}>Masque les matchs complets.</Text>
            </View>
            <Switch value={draft.onlyOpen} onValueChange={(v) => set({ onlyOpen: v })} trackColor={{ true: colors.orange2, false: colors.line }} thumbColor="#fff" />
          </View>
        </ScrollView>
        <Button
          title="Appliquer"
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.night, paddingHorizontal: 14, height: 40, borderRadius: 999 },
  filterText: { ...font.semibold, fontSize: 13, color: colors.chalk },
  count: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.orange2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countText: { ...font.bold, fontSize: 11, color: '#fff' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { ...font.semibold, fontSize: 12.5, color: colors.orange2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,23,.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 14, maxHeight: '85%' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...font.extrabold, fontSize: 22, color: colors.ink },
  reset: { ...font.semibold, fontSize: 14, color: colors.orange2 },
  muted: { ...font.regular, fontSize: 13, color: colors.dim },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14 },
  switchTitle: { ...font.semibold, fontSize: 15, color: colors.ink },
});
