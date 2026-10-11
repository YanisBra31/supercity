// Score d'un match entre deux équipes : les capitaines l'annoncent et le confirment, la modération tranche.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Match, MatchScore } from '../lib/api';
import { Button, Card, colors, font } from './ui';

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const btn = (icon: 'remove' | 'add', next: number) => (
    <Pressable
      onPress={() => onChange(Math.max(0, Math.min(99, next)))}
      hitSlop={8}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon} size={20} color={colors.orange2} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Text numberOfLines={1} style={{ ...font.semibold, fontSize: 13, color: colors.dim }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {btn('remove', value - 1)}
        <Text style={{ ...font.black, fontSize: 30, color: colors.ink, minWidth: 36, textAlign: 'center' }}>{value}</Text>
        {btn('add', value + 1)}
      </View>
    </View>
  );
}

/** Texte d'état du score pour celui qui regarde. */
function scoreHint(m: Match, sc: MatchScore): string {
  const reporter = sc.reported_by_team_id === m.home_team?.id ? m.home_team?.name : m.away_team?.name;
  if (sc.status === 'confirmed') return 'Score validé.';
  if (sc.status === 'disputed') return 'Les deux capitaines ne sont pas d\'accord. Annoncez le même score, ou la modération tranchera.';
  if (sc.status === 'reported') {
    return sc.can_confirm
      ? `${reporter} annonce ce score. Confirme-le, ou annonce le bon.`
      : `Annoncé par ${reporter}. En attente de l'autre capitaine (validé tout seul sous 48 h).`;
  }
  return sc.can_report ? 'Match terminé : annonce le score pour faire avancer la série de ton équipe.' : 'Score pas encore annoncé.';
}

export function ScoreCard({
  m,
  busy,
  moderator,
  onReport,
  onConfirm,
  onModerate,
}: {
  m: Match;
  busy: boolean;
  moderator: boolean;
  onReport: (home: number, away: number) => void;
  onConfirm: () => void;
  onModerate: (home: number, away: number) => void;
}) {
  const sc = m.score;
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState(sc?.home ?? 0);
  const [away, setAway] = useState(sc?.away ?? 0);
  if (!sc || m.status !== 'played' || !m.home_team || !m.away_team) return null;
  const canEdit = sc.can_report || moderator;
  const showForm = editing || (sc.can_report && sc.status === null);

  return (
    <Card style={{ gap: 12, borderColor: sc.status === 'disputed' ? colors.danger : colors.line, borderWidth: sc.status === 'disputed' ? 2 : 1 }}>
      <Text style={{ ...font.semibold, fontSize: 11, letterSpacing: 1.6, color: sc.status === 'disputed' ? colors.danger : colors.orange2 }}>
        {sc.status === 'disputed' ? 'SCORE CONTESTÉ' : 'RÉSULTAT'}
      </Text>
      <Text style={{ ...font.regular, fontSize: 14, color: colors.ink }}>{scoreHint(m, sc)}</Text>
      {showForm ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Stepper label={m.home_team.name} value={home} onChange={setHome} />
            <Stepper label={m.away_team.name} value={away} onChange={setAway} />
          </View>
          <Button
            title={sc.can_report ? 'Annoncer le score' : 'Valider ce score (modération)'}
            icon="checkmark"
            loading={busy}
            onPress={() => {
              setEditing(false);
              (sc.can_report ? onReport : onModerate)(home, away);
            }}
          />
        </>
      ) : null}
      {!showForm && sc.can_confirm ? <Button title={`Confirmer ${sc.home} - ${sc.away}`} icon="checkmark-done" loading={busy} onPress={onConfirm} /> : null}
      {!showForm && canEdit ? (
        <Button
          title={sc.can_report ? 'Annoncer un autre score' : 'Corriger le score (modération)'}
          variant="ghost"
          icon="create-outline"
          onPress={() => {
            setHome(sc.home ?? 0);
            setAway(sc.away ?? 0);
            setEditing(true);
          }}
        />
      ) : null}
    </Card>
  );
}
