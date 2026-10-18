// Ouvre une page Stripe (paiement, inscription organisateur) et attend le retour dans l'appli.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/** Adresse de retour vers l'appli (schéma supercity://, ou exp:// dans Expo Go). */
export function returnUrl(path: string): string {
  if (Platform.OS === 'web') return `${globalThis.location?.origin ?? ''}/${path}`;
  return Linking.createURL(path);
}

/** Ouvre la page Stripe ; renvoie true si le joueur est revenu par le lien de retour. */
export async function openStripe(url: string, back: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    globalThis.location?.assign(url);
    return false;
  }
  const res = await WebBrowser.openAuthSessionAsync(url, back);
  return res.type === 'success';
}

/** 5,50 € */
export function euros(cents: number): string {
  return `${(cents / 100).toFixed(cents % 100 ? 2 : 0).replace('.', ',')} €`;
}

/** Politique de confidentialité, publiée sur le site (la même adresse sert aux fiches des stores). */
export const PRIVACY_URL = 'https://supercity.fr/confidentialite/';

export function openPrivacy() {
  WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => undefined);
}
