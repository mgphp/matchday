import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as cognito from './cognito';
import type { StoredTokens } from './cognito';

const STORAGE_KEY = 'matchday:session';

export type AuthStatus =
  | { state: 'loading' }
  | { state: 'signedOut' }
  | { state: 'newPasswordRequired'; email: string; cognitoUser: CognitoUser }
  | { state: 'signedIn'; tokens: StoredTokens };

interface AuthContextValue {
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns a valid access token, transparently refreshing it if it's expired. */
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persist(tokens: StoredTokens): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (!raw) {
        if (!cancelled) setStatus({ state: 'signedOut' });
        return;
      }
      const tokens = JSON.parse(raw) as StoredTokens;
      try {
        const fresh = cognito.isExpired(tokens.accessToken)
          ? await cognito.refreshSession(tokens.email, tokens.refreshToken)
          : tokens;
        await persist(fresh);
        if (!cancelled) setStatus({ state: 'signedIn', tokens: fresh });
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
        if (!cancelled) setStatus({ state: 'signedOut' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await cognito.signIn(email, password);
    if (result.type === 'newPasswordRequired') {
      setStatus({ state: 'newPasswordRequired', email, cognitoUser: result.cognitoUser });
      return;
    }
    await persist(result.tokens);
    setStatus({ state: 'signedIn', tokens: result.tokens });
  }, []);

  const completeNewPassword = useCallback(
    async (newPassword: string) => {
      if (status.state !== 'newPasswordRequired') {
        throw new Error('no password challenge in progress');
      }
      const tokens = await cognito.completeNewPassword(
        status.cognitoUser,
        status.email,
        newPassword,
      );
      await persist(tokens);
      setStatus({ state: 'signedIn', tokens });
    },
    [status],
  );

  const signUp = useCallback(
    (email: string, password: string, name: string) => cognito.signUp(email, password, name),
    [],
  );

  const confirmSignUp = useCallback(
    (email: string, code: string) => cognito.confirmSignUp(email, code),
    [],
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setStatus({ state: 'signedOut' });
  }, []);

  const getAccessToken = useCallback(async () => {
    if (status.state !== 'signedIn') throw new Error('not signed in');
    if (!cognito.isExpired(status.tokens.accessToken)) return status.tokens.accessToken;
    const fresh = await cognito.refreshSession(status.tokens.email, status.tokens.refreshToken);
    await persist(fresh);
    setStatus({ state: 'signedIn', tokens: fresh });
    return fresh.accessToken;
  }, [status]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, signIn, completeNewPassword, signUp, confirmSignUp, signOut, getAccessToken }),
    [status, signIn, completeNewPassword, signUp, confirmSignUp, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
