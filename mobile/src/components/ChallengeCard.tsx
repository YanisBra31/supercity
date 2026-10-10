// Carte d'un défi : les deux blasons face à face, le créneau, le message et les actions.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Challenge } from '../lib/api';
import { formatLabel, whenLabel } from '../lib/format';
import { Gradient } from './brand';
import { Button, Card, colors, font, Meta, Pill, s, TeamCrest } from './ui';

const STATUS: Record<Challenge['status'], { text: string; tone: 'orange' | 'dark' | 'green' | 'grey' }> = {
  pending: { text: 'En attente', tone: 'orange' },
  accepted: { text: 'Accepté', tone: 'green' },
  declined: { text: 'Refusé', tone: 'grey' },
  cancelled: { text: 'Retiré', tone: 'grey' },
  expired: { text: 'Expiré', tone: 'grey' },
};

export function ChallengeCard({
  c,
  index,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: {
  c: Challenge;
  index?: number;
  busy?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const st = STATUS[c.status];
  return (
    <Card index={index} onPress={c.status === 'accepted' && c.match_id ? () => router.push(`/match/${c.match_id}`) : undefined} style={{ gap: 12 }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={css.kicker}>{c.can_respond ? 'Défi reçu' : c.can_cancel ? 'Défi envoyé' : 'Défi'}</Text>
        <Pill text={st.text} tone={st.tone} />
      </View>
      <Gradient tone="night" style={css.vs}>
        <View style={css.side}>
          <TeamCrest name={c.from_team.name} logo={c.from_team.logo_url} primary={c.from_team.color_primary} secondary={c.from_team.color_secondary} size={48} />
          <Text style={css.team} numberOfLines={2}>
            {c.from_team.name}
          </Text>
        </View>
        <Text style={css.vsText}>VS</Text>
        <View style={css.side}>
          <TeamCrest name={c.to_team.name} logo={c.to_team.logo_url} primary={c.to_team.color_primary} secondary={c.to_team.color_secondary} size={48} />
          <Text style={css.team} numberOfLines={2}>
            {c.to_team.name}
          </Text>
        </View>
      </Gradient>
      {c.starts_at ? <Meta icon="calendar-outline">{`${whenLabel(c.starts_at)}${c.format ? ` · ${formatLabel(c.format)}` : ''}`}</Meta> : null}
      {c.venue ? <Meta icon="location-outline">{c.venue.name}</Meta> : null}
      {c.message ? (
        <View style={css.bubble}>
          <Text style={css.bubbleText}>« {c.message} »</Text>
          {c.created_by ? <Text style={css.bubbleBy}>{c.created_by.display_name}</Text> : null}
        </View>
      ) : null}
      {c.response_message ? <Text style={[s.sub, { fontStyle: 'italic' }]}>Réponse : « {c.response_message} »</Text> : null}
      {c.can_respond ? (
        <View style={s.row}>
          <Button title="Relever le défi" icon="flash" onPress={onAccept ?? (() => undefined)} loading={busy} style={{ flex: 1 }} />
          <Button title="Refuser" variant="ghost" onPress={onDecline ?? (() => undefined)} />
        </View>
      ) : null}
      {c.can_cancel ? <Button title="Retirer le défi" variant="ghost" onPress={onCancel ?? (() => undefined)} loading={busy} /> : null}
      {c.status === 'accepted' && c.match_id ? <Text style={[css.kicker, { textAlign: 'center' }]}>Voir le match →</Text> : null}
    </Card>
  );
}

const css = StyleSheet.create({
  kicker: { ...font.semibold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.orange2 },
  vs: { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  team: { ...font.extrabold, fontSize: 13, color: colors.chalk, textAlign: 'center' },
  vsText: { ...font.black, fontSize: 22, color: colors.orange1 },
  bubble: { backgroundColor: colors.tint, borderRadius: 14, padding: 12, gap: 2 },
  bubbleText: { ...font.medium, fontSize: 14, color: colors.ink, lineHeight: 20 },
  bubbleBy: { ...font.semibold, fontSize: 12, color: colors.dim },
});
