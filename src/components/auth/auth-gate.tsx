import { useEffect, useState, type ReactNode } from 'react';

import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { useAuth } from '@/lib/auth/auth-context';
import { createCoachApi, type ManagedTeam } from '@/lib/coach-api';
import { setRepository } from '@/lib/data';
import { createHttpRepository } from '@/lib/data/http-repository';

import { ConfirmScreen } from './confirm-screen';
import { LoginScreen } from './login-screen';
import { NewPasswordScreen } from './new-password-screen';
import { OnboardingScreen, type OnboardingDetails } from './onboarding-screen';
import { RegisterScreen, type PendingRegistration } from './register-screen';
import { TeamPickerScreen } from './team-picker-screen';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type SetupState =
  | { step: 'loading' }
  | { step: 'needsCoachProfile' }
  | { step: 'needsTeam' }
  | { step: 'pickTeam'; teams: ManagedTeam[] }
  | { step: 'ready' }
  | { step: 'error'; message: string };

/**
 * Gates the app behind Cognito sign-in and coach/club/team setup. Renders the
 * auth/onboarding screens until a team is resolved and the data repository is
 * swapped to the real API, then renders `children` (the tab navigator).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, signIn, completeNewPassword, signUp, confirmSignUp, getAccessToken } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'confirm'>('login');
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [setup, setSetup] = useState<SetupState>({ step: 'loading' });

  useEffect(() => {
    if (status.state !== 'signedIn') return;
    let cancelled = false;
    const coachApi = createCoachApi({ baseUrl: API_URL, getAccessToken });

    (async () => {
      try {
        let coach = await coachApi.getMe();
        if (!coach && pendingRegistration) {
          const club = await coachApi.createClub(pendingRegistration.clubName);
          coach = await coachApi.registerCoach(pendingRegistration.name, club.id);
          const team = await coachApi.createTeam(
            pendingRegistration.teamName,
            pendingRegistration.teamShortName,
          );
          if (!cancelled) {
            setPendingRegistration(null);
            setRepository(
              createHttpRepository({ baseUrl: API_URL, teamId: team.id, getAccessToken }),
            );
            setSetup({ step: 'ready' });
          }
          return;
        }
        if (!coach) {
          if (!cancelled) setSetup({ step: 'needsCoachProfile' });
          return;
        }
        const teams = await coachApi.listMyTeams();
        if (teams.length === 0) {
          if (!cancelled) setSetup({ step: 'needsTeam' });
        } else if (teams.length === 1) {
          setRepository(
            createHttpRepository({ baseUrl: API_URL, teamId: teams[0].id, getAccessToken }),
          );
          if (!cancelled) setSetup({ step: 'ready' });
        } else if (!cancelled) {
          setSetup({ step: 'pickTeam', teams });
        }
      } catch (error) {
        if (!cancelled) {
          setSetup({
            step: 'error',
            message: error instanceof Error ? error.message : 'Setup failed.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, pendingRegistration, getAccessToken]);

  if (status.state === 'loading') {
    return (
      <Screen>
        <StateView state="loading" />
      </Screen>
    );
  }

  if (status.state === 'signedOut') {
    if (authScreen === 'register') {
      return (
        <RegisterScreen
          onSubmit={async (registration) => {
            await signUp(registration.email, registration.password, registration.name);
            setPendingRegistration(registration);
            setAuthScreen('confirm');
          }}
          onBackToLogin={() => setAuthScreen('login')}
        />
      );
    }
    if (authScreen === 'confirm' && pendingRegistration) {
      return (
        <ConfirmScreen
          email={pendingRegistration.email}
          onSubmit={async (code) => {
            await confirmSignUp(pendingRegistration.email, code);
            await signIn(pendingRegistration.email, pendingRegistration.password);
          }}
        />
      );
    }
    return <LoginScreen onSubmit={signIn} onRegister={() => setAuthScreen('register')} />;
  }

  if (status.state === 'newPasswordRequired') {
    return <NewPasswordScreen email={status.email} onSubmit={completeNewPassword} />;
  }

  if (setup.step === 'loading') {
    return (
      <Screen>
        <StateView state="loading" />
      </Screen>
    );
  }

  if (setup.step === 'error') {
    return (
      <Screen>
        <StateView
          state="error"
          message={setup.message}
          onRetry={() => setSetup({ step: 'loading' })}
        />
      </Screen>
    );
  }

  if (setup.step === 'needsCoachProfile' || setup.step === 'needsTeam') {
    const needsCoachProfile = setup.step === 'needsCoachProfile';
    const handleOnboardingSubmit = async (details: OnboardingDetails) => {
      const coachApi = createCoachApi({ baseUrl: API_URL, getAccessToken });
      if (needsCoachProfile && details.clubName && details.coachName) {
        const club = await coachApi.createClub(details.clubName);
        await coachApi.registerCoach(details.coachName, club.id);
      }
      const team = await coachApi.createTeam(details.teamName, details.teamShortName);
      setRepository(createHttpRepository({ baseUrl: API_URL, teamId: team.id, getAccessToken }));
      setSetup({ step: 'ready' });
    };
    return (
      <OnboardingScreen needsCoachProfile={needsCoachProfile} onSubmit={handleOnboardingSubmit} />
    );
  }

  if (setup.step === 'pickTeam') {
    return (
      <TeamPickerScreen
        teams={setup.teams}
        onSelect={(teamId) => {
          setRepository(createHttpRepository({ baseUrl: API_URL, teamId, getAccessToken }));
          setSetup({ step: 'ready' });
        }}
      />
    );
  }

  return <>{children}</>;
}
