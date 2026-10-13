// Notifications sur le téléphone : autorisation, jeton Expo envoyé à l'API, ouverture de l'écran visé quand on touche une alerte.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api, post } from './api';
import { getSearchCenter } from './location';

const native = Platform.OS === 'ios' || Platform.OS === 'android';
let current: string | null = null;

// Appli ouverte : l'alerte s'affiche quand même en bandeau.
if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Identifiant du projet EAS (écrit dans app.json par `npx eas init`), sans lequel Expo ne donne pas de jeton. */
function projectId(): string | undefined {
  return (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
}

/**
 * Demande l'autorisation (une seule fois, le système s'en souvient), puis inscrit ce téléphone avec sa position approchée
 * pour les alertes des terrains proches. Silencieux en cas d'échec : l'appli marche sans notifications.
 */
export async function registerPush(ask = true): Promise<'on' | 'denied' | 'unavailable'> {
  if (!native || !Device.isDevice || !projectId()) return 'unavailable';
  try {
    if (Platform.OS === 'android') {
      // Android 13+ ne montre la demande d'autorisation qu'une fois un canal créé.
      await Notifications.setNotificationChannelAsync('default', { name: 'Supercity', importance: Notifications.AndroidImportance.HIGH, lightColor: '#ff5223' });
    }
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted && ask) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return 'denied';
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    const { coords } = await getSearchCenter().catch(() => ({ coords: null }));
    await post('/me/push-token', { token, platform: Platform.OS, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) });
    current = token;
    return 'on';
  } catch {
    return 'unavailable';
  }
}

/** À la déconnexion : ce téléphone ne reçoit plus les alertes de ce compte. */
export async function unregisterPush(): Promise<void> {
  if (!current) return;
  await api('DELETE', '/me/push-token', { body: { token: current } }).catch(() => undefined);
  current = null;
}
