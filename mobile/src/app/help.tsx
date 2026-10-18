// Aide : les questions fréquentes, regroupées par thème, avec une recherche et un contact.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Hero } from '../components/brand';
import { Button, Card, colors, font, Kicker, Screen } from '../components/ui';
import { HELP, HELP_EMAIL } from '../lib/help';

// Recherche sans accents ni majuscules : « remboursement » trouve « Remboursé ».
const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Help() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [open, setOpen] = useState<string | null>(params.q ?? null);
  const [search, setSearch] = useState('');
  const words = plain(search).split(/\s+/).filter(Boolean);
  const topics = HELP.map((t) => ({
    ...t,
    items: t.items.filter((i) => words.every((w) => plain(`${i.q} ${i.a}`).includes(w))),
  })).filter((t) => t.items.length);

  return (
    <Screen>
      <Hero kicker="Aide" title="Une question ?" sub="Les réponses aux questions qu'on nous pose le plus." />
      <View style={st.search}>
        <Ionicons name="search" size={18} color={colors.dim} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rembourser, grade, pièces..."
          placeholderTextColor={colors.dim}
          style={st.input}
          accessibilityLabel="Chercher dans l'aide"
        />
      </View>
      {topics.map((t) => (
        <View key={t.title} style={{ gap: 8 }}>
          <Kicker>{t.title}</Kicker>
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            {t.items.map((i, n) => {
              const on = open === i.id || words.length > 0;
              return (
                <View key={i.id} style={n > 0 && st.sep}>
                  <Pressable
                    onPress={() => setOpen(open === i.id ? null : i.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: on }}
                    style={st.q}
                  >
                    <Text style={st.qText}>{i.q}</Text>
                    <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={colors.dim} />
                  </Pressable>
                  {on ? <Text style={st.a}>{i.a}</Text> : null}
                </View>
              );
            })}
          </Card>
        </View>
      ))}
      {!topics.length ? <Text style={st.none}>Aucune réponse pour « {search} ». Écris-nous !</Text> : null}
      <Card style={{ alignItems: 'center', gap: 10 }}>
        <Text style={st.contactTitle}>Pas trouvé ta réponse ?</Text>
        <Button title="Écrire à Supercity" icon="mail-outline" variant="dark" onPress={() => Linking.openURL(`mailto:${HELP_EMAIL}`)} />
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14 },
  input: { flex: 1, ...font.medium, fontSize: 15, color: colors.ink, paddingVertical: 13 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
  q: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  qText: { flex: 1, ...font.semibold, fontSize: 15, color: colors.ink },
  a: { ...font.medium, fontSize: 14, lineHeight: 21, color: colors.dim, paddingBottom: 14 },
  none: { ...font.medium, fontSize: 14, color: colors.dim, textAlign: 'center' },
  contactTitle: { ...font.bold, fontSize: 16, color: colors.ink },
});
