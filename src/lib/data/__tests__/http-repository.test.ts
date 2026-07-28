import { createHttpRepository } from '../http-repository';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('createHttpRepository', () => {
  const getAccessToken = async () => 'test-token';
  const options = { baseUrl: 'https://api.example.com/', teamId: 'team-1', getAccessToken };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches fixtures scoped to the team, with the bearer token attached', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse([{ id: 'm1', venue: 'Northgate Park' }]));

    const repo = createHttpRepository(options);
    const fixtures = await repo.getFixtures();

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/teams/team-1/fixtures', {
      headers: { authorization: 'Bearer test-token' },
    });
    expect(fixtures).toEqual([{ id: 'm1', venue: 'Northgate Park' }]);
  });

  it('defaults a missing venue to an empty string', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([{ id: 'm1' }]));

    const repo = createHttpRepository(options);
    const fixtures = await repo.getFixtures();

    expect(fixtures).toEqual([{ id: 'm1', venue: '' }]);
  });

  it('throws when the API responds with a non-ok status', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ error: 'forbidden' }, false, 403));

    const repo = createHttpRepository(options);
    await expect(repo.getTable()).rejects.toThrow('403');
  });

  it('addPlayer reads the current squad, appends the new player and PUTs the full array', async () => {
    const existing = [{ id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 }];
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(existing))
      .mockResolvedValueOnce(jsonResponse([]));

    const repo = createHttpRepository(options);
    const added = await repo.addPlayer({ name: 'New Kid', position: 'MF', squadNumber: 9 });

    expect(added.name).toBe('New Kid');
    expect(added.id).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.example.com/teams/team-1/squad', {
      headers: { authorization: 'Bearer test-token' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.example.com/teams/team-1/squad', {
      method: 'PUT',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify([...existing, added]),
    });
  });
});
