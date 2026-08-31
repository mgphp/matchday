import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { StoredTokens } from '../cognito';
import { clearSession, loadSession, saveSession } from '../session-store';

const secureStoreBacking = (SecureStore as unknown as { __store: Map<string, string> }).__store;

const tokens: StoredTokens = {
  idToken: 'id-token',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  email: 'coach@example.com',
};

describe('session-store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    secureStoreBacking.clear();
    jest.clearAllMocks();
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadSession()).toBeNull();
  });

  it('round-trips a session through secure storage', async () => {
    await saveSession(tokens);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(4);
    expect(await loadSession()).toEqual(tokens);
  });

  it('stores each token field under its own key to stay within the size cap', async () => {
    await saveSession(tokens);
    expect([...secureStoreBacking.keys()].sort()).toEqual([
      'matchday.session.accessToken',
      'matchday.session.email',
      'matchday.session.idToken',
      'matchday.session.refreshToken',
    ]);
  });

  it('clears every field and the legacy key', async () => {
    await saveSession(tokens);
    await AsyncStorage.setItem('matchday:session', 'stale');

    await clearSession();

    expect(await loadSession()).toBeNull();
    expect(await AsyncStorage.getItem('matchday:session')).toBeNull();
  });

  it('migrates a legacy AsyncStorage session into secure storage, once', async () => {
    await AsyncStorage.setItem('matchday:session', JSON.stringify(tokens));

    expect(await loadSession()).toEqual(tokens);
    expect(await AsyncStorage.getItem('matchday:session')).toBeNull();
    // Now served from secure storage on the next launch.
    expect(await loadSession()).toEqual(tokens);
  });

  it('ignores a malformed legacy session', async () => {
    await AsyncStorage.setItem('matchday:session', '{not json');

    expect(await loadSession()).toBeNull();
    expect(await AsyncStorage.getItem('matchday:session')).toBeNull();
  });
});
