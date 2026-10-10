// Passe le terrain tout juste créé à l'écran « Organiser » au retour de la modale.
import { Venue } from './api';

let last: Venue | null = null;
export const setLastVenue = (v: Venue) => {
  last = v;
};
export const takeLastVenue = (): Venue | null => {
  const v = last;
  last = null;
  return v;
};
