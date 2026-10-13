// Modération : événements bonus (points multipliés ou en plus) et scores contestés à trancher.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BonusEvent, del, get, Match, post } from '../lib/api';
import { dayLabel, timeLabel } from '../lib/format';
import { BonusBanner } from './Streak';
import { Button, Card, Chips, colors, Empty, Field, font, Kicker, Label, Loading, s } from './ui';

type Act = (fn: () => Promise<unknown>, done: string) => Promise<void>;

const MULTIPLIERS = [1, 2, 3, 5].map((v) => ({ value: v, label: v === 1 ? 'Aucun' : `x${v}` }));
const BONUSES = [0, 1, 2, 3, 5, 10].map((v) => ({ value: v, label: v ? `+${v}` : 'Aucun' }));
const DURATIONS = [
  { value: 1, label: '1 jour' },
  { value: 2, label: '2 jours' },
  { value: 7, label: '1 semaine' },
  { value: 14, label: '2 semaines' },
  { value: 31, label: '1 mois' },
];

/** Débuts proposés : maintenant, demain matin, ou samedi prochain (le week-end). */
function starts(): { value: string; label: string; date: Date }[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const saturday = new Date(tomorrow);
  saturday.setDate(tomorrow.getDate() + ((6 - tomorrow.getDay() + 7) % 7));
  return [
    { value: 'now', label: 'Maintenant', date: now },
    { value: 'tomorrow', label: 'Demain', date: tomorrow },
    { value: 'saturday', label: `Samedi ${saturday.getDate()}`, date: saturday },
  ];
}

export function ModEvents({ act }: { act: Act }) {
  const [items, setItems] = useState<BonusEvent[] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState(2);
  const [bonus, setBonus] = useState(0);
  const [start, setStart] = useState('saturday');
  const [days, setDays] = useState(2);

  const load = useCallback(async () => {
    setItems((await get<{ items: BonusEvent[] }>('/bonus-events').catch(() => ({ items: [] }))).items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const from = starts().find((x) => x.value === start)!.date;
  const to = new Date(from.getTime() + days * 86400 * 1000);
  const preview: BonusEvent = {
    id: 0,
    title: title.trim() || 'Ton événement',
    description: description.trim() || null,
    multiplier,
    bonus_points: bonus,
    venue: null,
    starts_at: from.toISOString(),
    ends_at: to.toISOString(),
    active: start === 'now',
  };

  return (
    <>
      <Kicker>Créer un événement</Kicker>
      <Card style={{ gap: 12 }}>
        <Field label="Nom" value={title} onChangeText={setTitle} placeholder="Week-end en feu" maxLength={60} />
        <Field label="Message (facultatif)" value={description} onChangeText={setDescription} placeholder="Tous les matchs du week-end comptent double !" maxLength={300} multiline />
        <Label>Points multipliés</Label>
        <Chips options={MULTIPLIERS} value={multiplier} onChange={(v) => v && setMultiplier(v)} />
        <Label>Points en plus par match joué</Label>
        <Chips options={BONUSES} value={bonus} onChange={(v) => v !== null && setBonus(v)} />
        <Label>Début</Label>
        <Chips options={starts()} value={start} onChange={(v) => v && setStart(v)} />
        <Label>Durée</Label>
        <Chips options={DURATIONS} value={days} onChange={(v) => v && setDays(v)} />
        <Text style={s.sub}>
          Du {dayLabel(from).toLowerCase()} {timeLabel(from)} au {dayLabel(to).toLowerCase()} {timeLabel(to)}. Compte pour les matchs qui commencent pendant
          l'événement, sur tous les terrains.
        </Text>
        <BonusBanner event={preview} compact />
        <Button
          title="Lancer l'événement"
          icon="flame"
          disabled={title.trim().length < 3 || (multiplier === 1 && bonus === 0)}
          onPress={() =>
            act(async () => {
              await post('/mod/bonus-events', {
                title: title.trim(),
                description: description.trim() || undefined,
                multiplier,
                bonus_points: bonus,
                starts_at: from.toISOString(),
                ends_at: to.toISOString(),
              });
              setTitle('');
              setDescription('');
              await load();
            }, 'Événement lancé : tout le monde le voit sur l\'accueil.')
          }
        />
      </Card>

      <Kicker>En cours et à venir</Kicker>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon="flash-outline" title="Aucun événement" text="Lance-en un pour faire bouger les terrains." />
      ) : (
        items.map((e) => (
          <View key={e.id} style={{ gap: 6 }}>
            <BonusBanner event={e} />
            <Button
              title="Supprimer"
              variant="ghost"
              icon="trash-outline"
              onPress={() =>
                act(async () => {
                  await del(`/mod/bonus-events/${e.id}`);
                  await load();
                }, 'Événement supprimé, les points sont recalculés.')
              }
            />
          </View>
        ))
      )}
    </>
  );
}

export function ModDisputes() {
  const [items, setItems] = useState<Match[] | null>(null);
  useEffect(() => {
    get<{ items: Match[] }>('/mod/disputes')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  if (items === null) return <Loading />;
  if (!items.length) return <Empty icon="checkmark-done-outline" title="Aucun score contesté" text="Les capitaines sont d'accord partout." />;
  return (
    <>
      <Text style={s.sub}>Les deux capitaines ont annoncé des scores différents. Ouvre le match pour valider le bon.</Text>
      {items.map((m) => (
        <Card key={m.id} onPress={() => router.push(`/match/${m.id}`)} style={{ gap: 4 }}>
          <Text style={{ ...font.bold, fontSize: 15, color: colors.ink }}>
            {m.home_team?.name} contre {m.away_team?.name}
          </Text>
          <Text style={s.sub}>
            {dayLabel(new Date(m.starts_at))} · {m.venue.name} · dernier score annoncé : {m.score?.home} - {m.score?.away}
          </Text>
        </Card>
      ))}
    </>
  );
}
