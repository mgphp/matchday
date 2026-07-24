import { createCoachApi } from '../coach-api';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('createCoachApi', () => {
  const getAccessToken = async () => 'test-token';
  const options = { baseUrl: 'https://api.example.com/', getAccessToken };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns undefined from getMe when the coach is not registered (404)', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ error: 'not registered' }, 404));

    const coachApi = createCoachApi(options);
    expect(await coachApi.getMe()).toBeUndefined();
  });

  it('returns the coach profile from getMe when registered', async () => {
    const coach = { id: 'coach-1', name: 'Mark', clubId: 'club-1' };
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(coach));

    const coachApi = createCoachApi(options);
    expect(await coachApi.getMe()).toEqual(coach);
  });

  it('posts a club and returns it', async () => {
    const club = { id: 'club-1', name: 'Junior Hoops' };
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(club, 201));

    const coachApi = createCoachApi(options);
    expect(await coachApi.createClub('Junior Hoops')).toEqual(club);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/clubs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Junior Hoops' }),
      }),
    );
  });

  it('throws when creating a team fails', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'max teams' }, 400));

    const coachApi = createCoachApi(options);
    await expect(coachApi.createTeam('Under 10 Bears', 'U10')).rejects.toThrow(
      'Could not create team.',
    );
  });

  it('lists the coach teams, defaulting to an empty array', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));

    const coachApi = createCoachApi(options);
    expect(await coachApi.listMyTeams()).toEqual([]);
  });
});
