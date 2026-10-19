// Session du joueur : chargée au démarrage, partagée par toute l'appli.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, Me, patch, post, setToken, setUnauthorizedHandler } from './api';
import { loadToken, saveToken } from './storage';

type AuthResponse = { user: Me; token: string };

type AuthState = {
  ready: boolean;
  user: Me | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; display_name: string; birth_date: string; accept_terms: boolean }) => Promise<void>;
  resetPassword: (data: { email: string; code: string; password: string }) => Promise<void>;
  setUser: (u: Me) => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Me>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    saveToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    const saved = loadToken();
    if (!saved) {
      setReady(true);
      return;
    }
    setToken(saved);
    get<Me>('/me')
      .then(setUser)
      // Jeton expiré ou serveur injoignable : on repart de l'accueil.
      .catch(clear)
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const start = useCallback((res: AuthResponse) => {
    setToken(res.token);
    saveToken(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      login: async (email, password) => start(await post<AuthResponse>('/auth/login', { email, password })),
      register: async (data) => start(await post<AuthResponse>('/auth/register', data)),
      resetPassword: async (data) => start(await post<AuthResponse>('/auth/password/reset', data)),
      setUser,
      logout: async () => {
        await post('/auth/logout').catch(() => undefined);
        clear();
      },
      updateProfile: async (data) => setUser(await patch<Me>('/me', data)),
    }),
    [ready, user, start, clear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
