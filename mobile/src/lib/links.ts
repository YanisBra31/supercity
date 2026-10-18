// Liens vers l'appli à partager : ils ouvrent l'appli web, sur téléphone comme sur ordinateur.
import { Platform, Share } from 'react-native';

/** Adresse de l'appli web (supercity.fr/app). */
export const WEB_APP = 'https://supercity.fr/app';

/** Lien web vers un écran de l'appli : webUrl('match/12'). Sur le web, garde le site sur lequel on est. */
export function webUrl(path: string): string {
  const origin = Platform.OS === 'web' ? globalThis.location?.origin : undefined;
  return `${origin ? `${origin}/app` : WEB_APP}/${path.replace(/^\//, '')}`;
}

/**
 * Partage un message. Sur ordinateur, où le partage n'existe pas toujours, le message est copié.
 * Renvoie 'copied' dans ce cas, pour pouvoir le dire au joueur.
 */
export async function shareMessage(message: string): Promise<'shared' | 'copied' | 'failed'> {
  if (Platform.OS !== 'web') {
    await Share.share({ message }).catch(() => undefined);
    return 'shared';
  }
  const nav = globalThis.navigator as Navigator | undefined;
  if (nav?.share) {
    try {
      await nav.share({ text: message });
      return 'shared';
    } catch (e) {
      // Partage annulé par le joueur : rien à dire.
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }
  try {
    await nav?.clipboard.writeText(message);
    return 'copied';
  } catch {
    return 'failed';
  }
}
