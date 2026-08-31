import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../auth-context';
import * as cognito from '../cognito';
import { loadSession, saveSession } from '../session-store';

// Keep the real isAuthError (pure classifier); stub only the fns that hit AWS.
jest.mock('../cognito', () => ({
  ...jest.requireActual('../cognito'),
  signIn: jest.fn(),
  signUp: jest.fn(),
  confirmSignUp: jest.fn(),
  forgotPassword: jest.fn(),
  confirmForgotPassword: jest.fn(),
  completeNewPassword: jest.fn(),
  refreshSession: jest.fn(),
  isExpired: jest.fn(),
}));

const mockedCognito = jest.mocked(cognito);
const secureStoreBacking = (SecureStore as unknown as { __store: Map<string, string> }).__store;

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
    secureStoreBacking.clear();
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
    expect(await loadSession()).toEqual(tokens);
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

  it('delegates forgotPassword to the Cognito wrapper', async () => {
    mockedCognito.forgotPassword.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));

    await act(async () => {
      await result.current.forgotPassword('coach@example.com');
    });

    expect(mockedCognito.forgotPassword).toHaveBeenCalledWith('coach@example.com');
  });

  it('delegates confirmForgotPassword to the Cognito wrapper', async () => {
    mockedCognito.confirmForgotPassword.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status.state).toBe('signedOut'));

    await act(async () => {
      await result.current.confirmForgotPassword('coach@example.com', '123456', 'newPassword123');
    });

    expect(mockedCognito.confirmForgotPassword).toHaveBeenCalledWith(
      'coach@example.com',
      '123456',
      'newPassword123',
    );
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
    expect(await loadSession()).toBeNull();
  });

  it('restores a stored session on launch without prompting to sign in', async () => {
    await saveSession(tokens);
    mockedCognito.isExpired.mockReturnValue(false);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toEqual({ state: 'signedIn', tokens }));
    expect(mockedCognito.refreshSession).not.toHaveBeenCalled();
  });

  it('keeps the coach signed in when the launch token refresh fails transiently', async () => {
    await saveSession(tokens);
    mockedCognito.isExpired.mockReturnValue(true);
    mockedCognito.refreshSession.mockRejectedValue(new Error('Network request failed'));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toEqual({ state: 'signedIn', tokens }));
    expect(await loadSession()).toEqual(tokens);
  });

  it('signs the coach out when the refresh token is rejected', async () => {
    await saveSession(tokens);
    mockedCognito.isExpired.mockReturnValue(true);
    mockedCognito.refreshSession.mockRejectedValue(
      Object.assign(new Error('Refresh Token has expired'), { code: 'NotAuthorizedException' }),
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toEqual({ state: 'signedOut' }));
    expect(await loadSession()).toBeNull();
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
