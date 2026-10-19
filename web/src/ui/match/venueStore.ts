// Passe le terrain tout juste ajouté (ou choisi) à la page « Organiser » au retour.
import { Venue } from '../../lib/api';

let last: Venue | null = null;
export const setLastVenue = (v: Venue) => {
  last = v;
};
export const takeLastVenue = (): Venue | null => {
  const v = last;
  last = null;
  return v;
};
