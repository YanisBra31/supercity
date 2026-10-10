// Jeton de connexion et réglages : trousseau sécurisé sur téléphone, localStorage sur le web.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'supercity_token';

export async function loadItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function saveItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value) globalThis.localStorage?.setItem(key, value);
    else globalThis.localStorage?.removeItem(key);
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

export const loadToken = () => loadItem(KEY);
export const saveToken = (token: string | null) => saveItem(KEY, token);
