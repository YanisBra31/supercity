// Petites données gardées dans le navigateur (session, lieu de recherche). Rien ne casse si le stockage est bloqué.
export function loadItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveItem(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Navigation privée stricte : la session ne survivra pas au rechargement, rien de plus.
  }
}

const TOKEN = 'supercity_token';
export const loadToken = () => loadItem(TOKEN);
export const saveToken = (token: string | null) => saveItem(TOKEN, token);
