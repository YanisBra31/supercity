// Réglages des notifications : autorisation du téléphone et types d'alertes reçues. Et le statut montré aux amis.
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { ApiError, Me, NotificationPrefs, patch } from '../lib/api';
import { registerPush } from '../lib/push';
import { Button, Card, colors, ErrorText, font, s } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

function Row({ icon, title, text, value, onChange }: { icon: IconName; title: string; text: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ionicons name={icon} size={22} color={colors.orange2} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...font.bold, fontSize: 15, color: colors.ink }}>{title}</Text>
        <Text style={s.sub}>{text}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.orange2, false: colors.line }} thumbColor={colors.white} {...({ activeThumbColor: colors.white } as object)} />
    </View>
  );
}

export function NotificationSettings({ user, onChange }: { user: Me; onChange: (u: Me) => void }) {
  const prefs = user.notifications ?? { events: true, streaks: true };
  const [phone, setPhone] = useState<'on' | 'denied' | 'unavailable' | null>(null);
  const [error, setError] = useState('');

  const set = async (key: keyof NotificationPrefs, value: boolean) => {
    setError('');
    onChange({ ...user, notifications: { ...prefs, [key]: value } });
    try {
      onChange({ ...user, notifications: await patch<NotificationPrefs>('/me/notifications', { [key]: value }) });
    } catch (e) {
      onChange({ ...user, notifications: prefs });
      setError(e instanceof ApiError ? e.message : 'Réglage impossible.');
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <Row icon="flash-outline" title="Événements bonus" text="Quand un événement fait gagner plus de points." value={prefs.events} onChange={(v) => set('events', v)} />
      <Row icon="flame-outline" title="Séries près de chez moi" text="Quand une équipe enchaîne les victoires sur un terrain du coin." value={prefs.streaks} onChange={(v) => set('streaks', v)} />
      {Platform.OS !== 'web' ? (
        phone === 'denied' ? (
          <Text style={[s.sub, { color: colors.danger }]}>Les notifications sont bloquées pour Supercity. Autorise-les dans les réglages du téléphone.</Text>
        ) : phone === 'unavailable' ? (
          <Text style={s.sub}>Les notifications ne sont pas disponibles sur cette version de l'appli.</Text>
        ) : phone === 'on' ? (
          <Text style={[s.sub, { color: colors.success }]}>Ce téléphone recevra les alertes.</Text>
        ) : (
          <Button title="Activer sur ce téléphone" variant="ghost" icon="notifications-outline" onPress={async () => setPhone(await registerPush())} />
        )
      ) : null}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

/** Montrer ou non à ses amis qu'on est en ligne ou en match. */
export function PresenceSetting({ user, onChange }: { user: Me; onChange: (u: Me) => void }) {
  const [error, setError] = useState('');
  const visible = user.show_presence ?? true;
  const set = async (v: boolean) => {
    setError('');
    onChange({ ...user, show_presence: v });
    try {
      onChange(await patch<Me>('/me/presence', { visible: v }));
    } catch (e) {
      onChange({ ...user, show_presence: visible });
      setError(e instanceof ApiError ? e.message : 'Réglage impossible.');
    }
  };
  return (
    <Card style={{ gap: 14 }}>
      <Row icon="radio-outline" title="Montrer mon statut" text="Tes amis voient si tu es en ligne, en match, et ton prochain match." value={visible} onChange={set} />
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
