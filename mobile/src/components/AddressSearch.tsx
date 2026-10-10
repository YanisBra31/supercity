// Champ d'adresse avec suggestions au fil de la frappe, et feuille « Autour de » pour choisir où chercher.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Place, searchAddress } from '../lib/address';
import { Coords } from '../lib/location';
import { colors, font, Label, s } from './ui';

const ICONS: Record<Place['kind'], keyof typeof Ionicons.glyphMap> = {
  housenumber: 'home-outline',
  street: 'git-commit-outline',
  locality: 'location-outline',
  municipality: 'business-outline',
};

export function AddressSearch({
  label,
  placeholder = 'Adresse, rue ou ville',
  near,
  initial = '',
  autoFocus,
  onSelect,
}: {
  label?: string;
  placeholder?: string;
  near?: Coords | null;
  initial?: string;
  autoFocus?: boolean;
  onSelect: (p: Place) => void;
}) {
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState(false);
  const picked = useRef(initial);

  // Attend une courte pause dans la frappe, et annule la recherche précédente.
  useEffect(() => {
    if (q === picked.current || q.trim().length < 3) {
      setItems([]);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      searchAddress(q, near, ctrl.signal)
        .then((r) => {
          setItems(r);
          setFailed(false);
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') setFailed(true);
        })
        .finally(() => setBusy(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, near?.lat, near?.lng]);

  const pick = (p: Place) => {
    picked.current = p.label;
    setQ(p.label);
    setItems([]);
    onSelect(p);
  };

  const waiting = q.trim().length >= 3 && q !== picked.current;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <View style={[s.input, focus && s.inputFocus]}>
        <Ionicons name="search" size={18} color={colors.dim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={placeholder}
          placeholderTextColor="#a59a92"
          autoCorrect={false}
          autoFocus={autoFocus}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={s.inputText}
          accessibilityLabel={label ?? placeholder}
        />
        {busy ? <ActivityIndicator size="small" color={colors.orange2} /> : null}
        {q && !busy ? (
          <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Effacer">
            <Ionicons name="close-circle" size={18} color={colors.dim} />
          </Pressable>
        ) : null}
      </View>
      {items.length ? (
        <View style={st.list}>
          {items.map((p, i) => (
            <Pressable
              key={`${p.label}-${i}`}
              onPress={() => pick(p)}
              accessibilityRole="button"
              style={({ pressed }) => [st.item, i > 0 && st.sep, pressed && { backgroundColor: colors.tint }]}
            >
              <Ionicons name={ICONS[p.kind] ?? 'location-outline'} size={18} color={colors.orange2} />
              <View style={{ flex: 1 }}>
                <Text style={st.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={st.sub} numberOfLines={1}>
                  {[p.postcode, p.city].filter(Boolean).join(' ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : waiting && !busy ? (
        <Text style={st.sub}>{failed ? 'Recherche indisponible, vérifie ta connexion.' : 'Aucune adresse trouvée.'}</Text>
      ) : null}
    </View>
  );
}

/** Feuille pour choisir où chercher : une ville ou une adresse, ou la position du téléphone. */
export function PlaceSheet({
  visible,
  near,
  onPick,
  onClose,
}: {
  visible: boolean;
  near?: Coords | null;
  onPick: (p: Place | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.grabber} />
        <Text style={st.title}>Chercher autour de…</Text>
        <Pressable
          onPress={() => {
            onPick(null);
            onClose();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [st.mine, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="navigate" size={18} color={colors.orange2} />
          <Text style={st.name}>Ma position actuelle</Text>
        </Pressable>
        {visible ? (
          <AddressSearch
            placeholder="Ville, quartier ou adresse"
            near={near}
            autoFocus
            onSelect={(p) => {
              onPick(p);
              onClose();
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

/** Pastille « Autour de … » qui ouvre la feuille. */
export function PlaceButton({ place, hasCoords, onPress }: { place: Place | null; hasCoords: boolean; onPress: () => void }) {
  const text = place ? (place.kind === 'municipality' ? place.label : place.name) : hasCoords ? 'Ma position' : 'Choisir un lieu';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Chercher autour de ${text}, modifier`} style={({ pressed }) => [st.placeBtn, pressed && { opacity: 0.8 }]}>
      <Ionicons name={place ? 'location' : 'navigate'} size={16} color={colors.orange2} />
      <Text style={st.placeText} numberOfLines={1}>
        Autour de <Text style={{ ...font.bold, color: colors.ink }}>{text}</Text>
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.dim} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  list: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
  name: { ...font.semibold, fontSize: 15, color: colors.ink },
  sub: { ...font.regular, fontSize: 12.5, color: colors.dim },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,23,.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 14, maxHeight: '85%', minHeight: '60%' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  title: { ...font.extrabold, fontSize: 22, color: colors.ink },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: colors.white, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, height: 36 },
  placeText: { ...font.regular, fontSize: 13.5, color: colors.dim, flexShrink: 1 },
});
