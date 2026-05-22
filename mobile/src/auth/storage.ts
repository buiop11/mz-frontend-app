import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

const isWeb = Platform.OS === 'web';

function getWebStorage(): Storage | null {
  if (!globalThis.window) return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    const s = getWebStorage();
    if (s) s.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    const s = getWebStorage();
    return s ? s.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    const s = getWebStorage();
    if (s) s.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type StoredUser = {
  id: string;
  name: string;
  email: string;
};

export async function saveSession(token: string, user: StoredUser) {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; user: StoredUser } | null> {
  const token = await getItem(TOKEN_KEY);
  const userRaw = await getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as StoredUser };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await removeItem(TOKEN_KEY);
  await removeItem(USER_KEY);
}
