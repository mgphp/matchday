import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAuth } from '@/lib/auth/auth-context';
import { createCoachApi } from '@/lib/coach-api';
import { setRepository } from '@/lib/data';
import { createHttpRepository } from '@/lib/data/http-repository';

import { AuthGate } from '../auth-gate';

jest.mock('@/lib/auth/auth-context');
jest.mock('@/lib/coach-api');
jest.mock('@/lib/data');
jest.mock('@/lib/data/http-repository');

const mockedUseAuth = jest.mocked(useAuth);
const mockedCreateCoachApi = jest.mocked(createCoachApi);
const mockedCreateHttpRepository = jest.mocked(createHttpRepository);

function baseAuth(overrides: Partial<ReturnType<typeof useAuth>>) {
  return {
    status: { state: 'signedOut' },
    signIn: jest.fn(),
    completeNewPassword: jest.fn(),
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
    signOut: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue('token'),
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>;
}

describe('AuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateHttpRepository.mockReturnValue({} as ReturnType<typeof createHttpRepository>);
  });

  it('shows a loading state before auth status resolves', async () => {
    mockedUseAuth.mockReturnValue(baseAuth({ status: { state: 'loading' } }));

    await render(
      <AuthGate>
        <Text>Tabs</Text>
      </AuthGate>,
    );

    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('shows the login screen when signed out', async () => {
    mockedUseAuth.mockReturnValue(baseAuth({ status: { state: 'signedOut' } }));

    await render(
      <AuthGate>
        <Text>Tabs</Text>
      </AuthGate>,
    );

    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('shows the new-password screen when Cognito requires it', async () => {
    mockedUseAuth.mockReturnValue(
      baseAuth({
        status: {
          state: 'newPasswordRequired',
          email: 'coach@example.com',
          cognitoUser: {} as never,
        },
      }),
    );

    await render(
      <AuthGate>
        <Text>Tabs</Text>
      </AuthGate>,
    );

    expect(screen.getByText(/coach@example.com/)).toBeTruthy();
  });

  it('prompts onboarding when a signed-in coach has no profile yet', async () => {
    mockedUseAuth.mockReturnValue(
      baseAuth({ status: { state: 'signedIn', tokens: { email: 'coach@example.com' } as never } }),
    );
    mockedCreateCoachApi.mockReturnValue({
      getMe: jest.fn().mockResolvedValue(undefined),
      listMyTeams: jest.fn(),
      createClub: jest.fn(),
      registerCoach: jest.fn(),
      createTeam: jest.fn(),
    } as unknown as ReturnType<typeof createCoachApi>);

    await render(
      <AuthGate>
        <Text>Tabs</Text>
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByLabelText('Your name')).toBeTruthy());
  });

  it('renders the app once signed in with exactly one team, and swaps the repository', async () => {
    mockedUseAuth.mockReturnValue(
      baseAuth({ status: { state: 'signedIn', tokens: { email: 'coach@example.com' } as never } }),
    );
    mockedCreateCoachApi.mockReturnValue({
      getMe: jest.fn().mockResolvedValue({ id: 'coach-1', name: 'Mark', clubId: 'club-1' }),
      listMyTeams: jest
        .fn()
        .mockResolvedValue([
          { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10', clubId: 'club-1' },
        ]),
      createClub: jest.fn(),
      registerCoach: jest.fn(),
      createTeam: jest.fn(),
    } as unknown as ReturnType<typeof createCoachApi>);

    await render(
      <AuthGate>
        <Text>Tabs</Text>
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByText('Tabs')).toBeTruthy());
    expect(setRepository).toHaveBeenCalled();
    expect(mockedCreateHttpRepository).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-1' }),
    );
  });

  it('shows a team picker when the coach has more than one team', async () => {
    mockedUseAuth.mockReturnValue(
      baseAuth({ status: { state: 'signedIn', tokens: { email: 'coach@example.com' } as never } }),
    );
    mockedCreateCoachApi.mockReturnValue({
      getMe: jest.fn().mockResolvedValue({ id: 'coach-1', name: 'Mark', clubId: 'club-1' }),
      listMyTeams: jest.fn().mockResolvedValue([
        { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10', clubId: 'club-1' },
        { id: 'team-2', name: 'Under 12 Bears', shortName: 'U12', clubId: 'club-1' },
      ]),
      createClub: jest.fn(),
      registerCoach: jest.fn(),
      createTeam: jest.fn(),
    } as unknown as ReturnType<typeof createCoachApi>);

    await render(
      <AuthGate>
        <Text>Tabs</Text>
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByText('Under 10 Bears')).toBeTruthy());
    expect(screen.getByText('Under 12 Bears')).toBeTruthy();
  });
});
