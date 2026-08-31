import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { StoredTokens } from './cognito';

/** Single-blob key used before the session moved into secure storage. */
const LEGACY_KEY = 'matchday:session';

/**
 * SecureStore caps a value at ~2KB on Android and a full JWT trio can exceed
 * that, so each field of the session is stored under its own key.
 */
const KEYS: Record<keyof StoredTokens, string> = {
  idToken: 'matchday.session.idToken',
  accessToken: 'matchday.session.accessToken',
  refreshToken: 'matchday.session.refreshToken',
  email: 'matchday.session.email',
};

const FIELDS = Object.keys(KEYS) as (keyof StoredTokens)[];

/** SecureStore has no web implementation — fall back to AsyncStorage there. */
const secure = Platform.OS !== 'web';

function readRaw(key: string): Promise<string | null> {
  return secure ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key);
}

function writeRaw(key: string, value: string): Promise<void> {
  return secure ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value);
}

function deleteRaw(key: string): Promise<void> {
  return secure ? SecureStore.deleteItemAsync(key) : AsyncStorage.removeItem(key);
}

/** Moves a pre-secure-storage session into secure storage, once. */
async function migrateLegacySession(): Promise<StoredTokens | null> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(LEGACY_KEY);
  try {
    const tokens = JSON.parse(raw) as StoredTokens;
    if (FIELDS.some((field) => typeof tokens[field] !== 'string')) return null;
    await saveSession(tokens);
    return tokens;
  } catch {
    return null;
  }
}

/** The stored coach session, or null if there isn't a complete one. */
export async function loadSession(): Promise<StoredTokens | null> {
  const values = await Promise.all(FIELDS.map((field) => readRaw(KEYS[field])));
  if (values.some((value) => value == null)) return migrateLegacySession();
  const tokens = {} as StoredTokens;
  FIELDS.forEach((field, index) => {
    tokens[field] = values[index] as string;
  });
  return tokens;
}

export async function saveSession(tokens: StoredTokens): Promise<void> {
  await Promise.all(FIELDS.map((field) => writeRaw(KEYS[field], tokens[field])));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    ...FIELDS.map((field) => deleteRaw(KEYS[field])),
    AsyncStorage.removeItem(LEGACY_KEY),
  ]);
}
