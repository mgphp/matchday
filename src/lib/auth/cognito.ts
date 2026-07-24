import {
  AuthenticationDetails,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

export interface StoredTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  email: string;
}

export type SignInResult =
  | { type: 'success'; tokens: StoredTokens }
  | { type: 'newPasswordRequired'; cognitoUser: CognitoUser };

function pool(): CognitoUserPool {
  return new CognitoUserPool({
    UserPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
    ClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
  });
}

function extractTokens(session: CognitoUserSession, email: string): StoredTokens {
  return {
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
    email,
  };
}

export function signUp(email: string, password: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pool().signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'name', Value: name })],
      [],
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool() });
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()));
  });
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool() });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve({ type: 'success', tokens: extractTokens(session, email) }),
      onFailure: (err: Error) => reject(err),
      newPasswordRequired: () => resolve({ type: 'newPasswordRequired', cognitoUser }),
    });
  });
}

export function completeNewPassword(
  cognitoUser: CognitoUser,
  email: string,
  newPassword: string,
): Promise<StoredTokens> {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(
      newPassword,
      {},
      {
        onSuccess: (session) => resolve(extractTokens(session, email)),
        onFailure: (err: Error) => reject(err),
      },
    );
  });
}

export function refreshSession(email: string, refreshToken: string): Promise<StoredTokens> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool() });
    cognitoUser.refreshSession(
      new CognitoRefreshToken({ RefreshToken: refreshToken }),
      (err: Error | null, session: CognitoUserSession) => {
        if (err) return reject(err);
        resolve(extractTokens(session, email));
      },
    );
  });
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Minimal base64url → UTF-8 string decoder (no Buffer/atob available in Hermes). */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  let bitBuffer = 0;
  let bitCount = 0;
  let bytes = '';
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    bitBuffer = (bitBuffer << 6) | value;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes += String.fromCharCode((bitBuffer >> bitCount) & 0xff);
    }
  }
  return decodeURIComponent(
    bytes
      .split('')
      .map((byte) => '%' + byte.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
}

/** Decodes the JWT payload without verifying the signature — client-side use only. */
function decodeJwtPayload(token: string): { exp?: number } {
  const payload = token.split('.')[1] ?? '';
  return JSON.parse(base64UrlDecode(payload)) as { exp?: number };
}

/** True if the token is expired, or expires within the next 30s. */
export function isExpired(token: string): boolean {
  try {
    const { exp } = decodeJwtPayload(token);
    return !exp || Date.now() >= exp * 1000 - 30_000;
  } catch {
    return true;
  }
}
