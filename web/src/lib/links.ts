// Liens vers l'appli à partager, et partage (ou copie sur ordinateur).

/** Lien web vers un écran de l'appli : webUrl('match/12'). */
export function webUrl(path: string): string {
  return `${location.origin}/app/${path.replace(/^\//, '')}`;
}

/** Partage un message ; là où le partage n'existe pas (ordinateur), il est copié. */
export async function shareMessage(message: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ text: message });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(message);
    return 'copied';
  } catch {
    return 'failed';
  }
}
