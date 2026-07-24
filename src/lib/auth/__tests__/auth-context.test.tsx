import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../auth-context';
import * as cognito from '../cognito';

jest.mock('../cognito');

const mockedCognito = jest.mocked(cognito);

const tokens = {
  idToken: 'id-token',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  email: 'coach@example.com',
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider / useAuth', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('becomes signedOut when no session is stored', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));
  });

  it('signs in and persists the session', async () => {
    mockedCognito.signIn.mockResolvedValue({ type: 'success', tokens });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));

    await act(async () => {
      await result.current.signIn('coach@example.com', 'password123');
    });

    expect(result.current.status).toEqual({ state: 'signedIn', tokens });
    const stored = await AsyncStorage.getItem('matchday:session');
    expect(JSON.parse(stored ?? '{}')).toEqual(tokens);
  });

  it('surfaces a new-password challenge instead of signing in', async () => {
    const cognitoUser = {} as CognitoUser;
    mockedCognito.signIn.mockResolvedValue({ type: 'newPasswordRequired', cognitoUser });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));

    await act(async () => {
      await result.current.signIn('coach@example.com', 'temp-password');
    });

    expect(result.current.status).toEqual({
      state: 'newPasswordRequired',
      email: 'coach@example.com',
      cognitoUser,
    });
  });

  it('completes the new-password challenge and signs in', async () => {
    const cognitoUser = {} as CognitoUser;
    mockedCognito.signIn.mockResolvedValue({ type: 'newPasswordRequired', cognitoUser });
    mockedCognito.completeNewPassword.mockResolvedValue(tokens);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));
    await act(async () => {
      await result.current.signIn('coach@example.com', 'temp-password');
    });

    await act(async () => {
      await result.current.completeNewPassword('newPassword123');
    });

    expect(result.current.status).toEqual({ state: 'signedIn', tokens });
  });

  it('signs out and clears the stored session', async () => {
    mockedCognito.signIn.mockResolvedValue({ type: 'success', tokens });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));
    await act(async () => {
      await result.current.signIn('coach@example.com', 'password123');
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toEqual({ state: 'signedOut' });
    expect(await AsyncStorage.getItem('matchday:session')).toBeNull();
  });

  it('refreshes an expired access token on demand', async () => {
    mockedCognito.signIn.mockResolvedValue({ type: 'success', tokens });
    mockedCognito.isExpired.mockReturnValue(true);
    const refreshedTokens = { ...tokens, accessToken: 'new-access-token' };
    mockedCognito.refreshSession.mockResolvedValue(refreshedTokens);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));
    await act(async () => {
      await result.current.signIn('coach@example.com', 'password123');
    });

    let accessToken = '';
    await act(async () => {
      accessToken = await result.current.getAccessToken();
    });

    expect(accessToken).toBe('new-access-token');
    expect(mockedCognito.refreshSession).toHaveBeenCalledWith('coach@example.com', 'refresh-token');
  });
});
