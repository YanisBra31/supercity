// Paiements Stripe : on quitte l'appli pour la page Stripe, qui ramène sur l'écran d'où l'on vient.

/** Adresse de retour après Stripe : la page de l'appli (supercity.fr/app/...). */
export function returnUrl(path: string): string {
  return `${location.origin}/app/${path.replace(/^\//, '')}`;
}

/** Ouvre la page Stripe à la place de l'appli. */
export function openStripe(url: string): Promise<never> {
  location.assign(url);
  return new Promise(() => undefined);
}

/** 5,50 € */
export function euros(cents: number): string {
  return `${(cents / 100).toFixed(cents % 100 ? 2 : 0).replace('.', ',')} €`;
}

export const PRIVACY_URL = '/confidentialite/';
