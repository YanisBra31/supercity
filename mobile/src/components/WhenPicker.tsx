// Choix du jour et de l'heure d'un match : deux lignes de choix rapides déjà remplies, le calendrier complet en option dans un volet.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient } from './brand';
import { Button, Chip, colors, font } from './ui';
import { sheetWidth } from './WebFrame';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const SLOTS = [
  { label: 'Matin', from: 8 * 60, to: 12 * 60 },
  { label: 'Après-midi', from: 12 * 60, to: 18 * 60 },
  { label: 'Soir', from: 18 * 60, to: 24 * 60 },
];
// On peut publier jusqu'à 3 mois à l'avance.
const MAX_DAYS = 90;
const LEAD_MS = 15 * 60 * 1000;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const at = (day: Date, minutes: number) => new Date(day.getTime() + minutes * 60000);
const hhmm = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;

/** Créneaux de 30 min encore possibles ce jour-là (au moins 15 min d'avance). */
export function freeTimes(day: Date): number[] {
  const out: number[] = [];
  for (let m = 8 * 60; m < 24 * 60; m += 30) if (at(day, m).getTime() >= Date.now() + LEAD_MS) out.push(m);
  return out;
}

const SHORT_DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
// Les heures où l'on joue le plus : proposées en premier, 19h par défaut.
const USUAL = [18 * 60, 19 * 60, 20 * 60, 21 * 60];

const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const same = (a: Date, b: Date) => a.getTime() === b.getTime();
const shortDay = (d: Date) => {
  const today = startOfDay(new Date());
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, plusDays(today, 1))) return 'Demain';
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()}`;
};

/** Heure proposée d'office ce jour-là : 19h si possible, sinon la plus proche des heures habituelles. */
export function defaultTime(day: Date): number | null {
  const free = freeTimes(day);
  return [19 * 60, 20 * 60, 21 * 60, 18 * 60].find((m) => free.includes(m)) ?? free[0] ?? null;
}

/** Premier jour où il reste un créneau (aujourd'hui, ou demain s'il est tard). */
export function firstOpenDay(): Date {
  const today = startOfDay(new Date());
  return freeTimes(today).length ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
}

export function CalendarPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const today = startOfDay(new Date());
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MAX_DAYS);
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= last;
  // Grille commençant le lundi : cases vides avant le 1er.
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <View style={st.cal}>
      <View style={st.head}>
        <Pressable onPress={() => canPrev && shift(-1)} disabled={!canPrev} accessibilityRole="button" accessibilityLabel="Mois précédent" style={[st.nav, !canPrev && { opacity: 0.3 }]}>
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <Text style={st.month}>{`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}</Text>
        <Pressable onPress={() => canNext && shift(1)} disabled={!canNext} accessibilityRole="button" accessibilityLabel="Mois suivant" style={[st.nav, !canNext && { opacity: 0.3 }]}>
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>
      </View>
      <View style={st.grid}>
        {WEEK.map((w, i) => (
          <View key={i} style={st.cell}>
            <Text style={st.week}>{w}</Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={st.cell} />;
          const off = d < today || d > last || !freeTimes(d).length;
          const on = d.getTime() === value.getTime();
          const isToday = d.getTime() === today.getTime();
          return (
            <Pressable
              key={i}
              style={st.cell}
              disabled={off}
              onPress={() => onChange(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: off }}
              accessibilityLabel={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              {on ? (
                <Gradient style={st.dot}>
                  <Text style={[st.num, { color: colors.chalk }]}>{d.getDate()}</Text>
                </Gradient>
              ) : (
                <View style={[st.dot, isToday && st.today]}>
                  <Text style={[st.num, off && { color: colors.line }]}>{d.getDate()}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TimePicker({ day, value, onChange }: { day: Date; value: number | null; onChange: (m: number) => void }) {
  const free = freeTimes(day);
  const half = value !== null && value % 60 ? 30 : 0;
  // Une puce par heure, puis « pile » ou « et demie » : moins de puces à parcourir.
  const pickHour = (h: number) => onChange(free.includes(h * 60 + half) ? h * 60 + half : free.includes(h * 60) ? h * 60 : h * 60 + 30);
  const hourOn = (h: number) => free.includes(h * 60) || free.includes(h * 60 + 30);
  return (
    <View style={{ gap: 10 }}>
      {SLOTS.map((slot) => {
        const hours: number[] = [];
        for (let h = slot.from / 60; h < slot.to / 60; h++) if (hourOn(h)) hours.push(h);
        if (!hours.length) return null;
        return (
          <View key={slot.label} style={{ gap: 6 }}>
            <Text style={st.slot}>{slot.label}</Text>
            <View style={st.times}>
              {hours.map((h) => (
                <Chip key={h} label={`${h}h`} on={value !== null && Math.floor(value / 60) === h} onPress={() => pickHour(h)} />
              ))}
            </View>
          </View>
        );
      })}
      {value !== null ? (
        <View style={{ gap: 6 }}>
          <Text style={st.slot}>Minutes</Text>
          <View style={st.times}>
          {[0, 30].map((m) => {
            const v = Math.floor(value / 60) * 60 + m;
            return free.includes(v) ? <Chip key={m} label={hhmm(v).replace(/h$/, 'h00')} on={v === value} onPress={() => onChange(v)} /> : null;
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Deux lignes : jours proches et heures habituelles, déjà choisis. L'icône calendrier ouvre tout le reste. */
export function WhenField({ day, minutes, onChange }: { day: Date; minutes: number | null; onChange: (day: Date, minutes: number | null) => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const today = startOfDay(new Date());
  // Aujourd'hui (s'il reste un créneau), demain, puis le prochain week-end.
  const sat = plusDays(today, ((6 - today.getDay() + 7) % 7) || 7);
  const quickDays = [...(freeTimes(today).length ? [today] : []), plusDays(today, 1), sat, plusDays(sat, 1)]
    .filter((d, i, a) => a.findIndex((x) => same(x, d)) === i)
    .slice(0, 3);
  // Un jour choisi dans le calendrier prend la place du dernier, pour rester sur une ligne.
  if (!quickDays.some((d) => same(d, day))) quickDays[quickDays.length - 1] = day;
  const free = freeTimes(day);
  const quickTimes = USUAL.filter((m) => free.includes(m));
  if (minutes !== null && !quickTimes.includes(minutes)) quickTimes.push(minutes);
  // Changer de jour garde l'heure si elle est encore libre, sinon en propose une.
  const pickDay = (d: Date) => onChange(d, minutes !== null && freeTimes(d).includes(minutes) ? minutes : defaultTime(d));

  return (
    <View style={{ gap: 8 }}>
      <View style={st.row}>
        {quickDays.map((d) => (
          <Chip key={d.getTime()} label={shortDay(d)} on={same(d, day)} onPress={() => pickDay(d)} />
        ))}
      </View>
      <View style={st.row}>
        {quickTimes.map((m) => (
          <Chip key={m} label={hhmm(m)} on={m === minutes} onPress={() => onChange(day, m)} />
        ))}
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Autre jour ou autre heure" style={st.more}>
          <Ionicons name="calendar-outline" size={16} color={colors.orange2} />
          <Text style={st.moreText}>Autre</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Fermer" />
        <View style={[st.sheet, sheetWidth, { paddingBottom: insets.bottom + 16 }]}>
          <View style={st.grabber} />
          <Text style={st.title}>Quand ?</Text>
          <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
            <CalendarPicker value={day} onChange={pickDay} />
            <TimePicker day={day} value={minutes} onChange={(m) => onChange(day, m)} />
          </ScrollView>
          <Button title="C'est bon" icon="checkmark" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  cal: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, padding: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  month: { ...font.bold, fontSize: 15, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  week: { ...font.semibold, fontSize: 12, color: colors.dim },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.orange2 },
  num: { ...font.semibold, fontSize: 14, color: colors.ink },
  slot: { ...font.semibold, fontSize: 12, color: colors.dim, textTransform: 'uppercase', letterSpacing: 0.6 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.orange2, borderStyle: 'dashed' },
  moreText: { ...font.semibold, fontSize: 13, color: colors.orange2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,23,.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 14, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  title: { ...font.extrabold, fontSize: 22, color: colors.ink },
});
