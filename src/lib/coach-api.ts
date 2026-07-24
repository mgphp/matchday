export interface Coach {
  id: string;
  name: string;
  clubId: string;
}

export interface ManagedTeam {
  id: string;
  name: string;
  shortName: string;
  clubId: string;
}

interface CoachApiOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
}

async function call<T>(
  { baseUrl, getAccessToken }: CoachApiOptions,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T }> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? undefined : ((await res.json()) as T);
  return { ok: res.ok, status: res.status, data };
}

/** Client for the coach/club/team management endpoints (registration, onboarding). */
export function createCoachApi(options: CoachApiOptions) {
  return {
    getMe: async (): Promise<Coach | undefined> => {
      const res = await call<Coach>(options, 'GET', 'coaches/me');
      return res.status === 404 ? undefined : res.data;
    },
    createClub: async (name: string): Promise<{ id: string; name: string }> => {
      const res = await call<{ id: string; name: string }>(options, 'POST', 'clubs', { name });
      if (!res.ok || !res.data) throw new Error('Could not create club.');
      return res.data;
    },
    registerCoach: async (name: string, clubId: string): Promise<Coach> => {
      const res = await call<Coach>(options, 'POST', 'coaches/register', { name, clubId });
      if (!res.ok || !res.data) throw new Error('Could not register coach.');
      return res.data;
    },
    listMyTeams: async (): Promise<ManagedTeam[]> => {
      const res = await call<ManagedTeam[]>(options, 'GET', 'coaches/me/teams');
      return res.data ?? [];
    },
    createTeam: async (name: string, shortName: string): Promise<ManagedTeam> => {
      const res = await call<ManagedTeam>(options, 'POST', 'coaches/me/teams', { name, shortName });
      if (!res.ok || !res.data) throw new Error('Could not create team.');
      return res.data;
    },
  };
}

export type CoachApi = ReturnType<typeof createCoachApi>;
