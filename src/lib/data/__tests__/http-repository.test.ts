import type { Player } from '@/lib/types';

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

  it('updatePlayer reads the squad, replaces the matching player and PUTs the full array', async () => {
    const existing: Player[] = [
      { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 },
      { id: 'p2', name: 'Danny Whitmore', position: 'DF', squadNumber: 2 },
    ];
    const updated: Player = { id: 'p2', name: 'Danny W.', position: 'DF', squadNumber: 2 };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(existing))
      .mockResolvedValueOnce(jsonResponse([]));

    const repo = createHttpRepository(options);
    const result = await repo.updatePlayer(updated);

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.example.com/teams/team-1/squad', {
      method: 'PUT',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify([existing[0], updated]),
    });
  });

  it('removePlayer reads the squad, drops the matching player and PUTs the rest', async () => {
    const existing: Player[] = [
      { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 },
      { id: 'p2', name: 'Danny Whitmore', position: 'DF', squadNumber: 2 },
    ];
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(existing))
      .mockResolvedValueOnce(jsonResponse([]));

    const repo = createHttpRepository(options);
    await repo.removePlayer('p1');

    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.example.com/teams/team-1/squad', {
      method: 'PUT',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify([existing[1]]),
    });
  });

  it('createMatch POSTs the fixture as scheduled and defaults the returned venue', async () => {
    const input = {
      competition: 'League Cup',
      kickoff: '2026-09-05T10:00:00Z',
      venue: 'Bear Pit',
      home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
      away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
    };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ id: 'm9', ...input, status: 'scheduled', events: [] }));

    const repo = createHttpRepository(options);
    const match = await repo.createMatch(input);

    expect(match.id).toBe('m9');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/teams/team-1/matches', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, status: 'scheduled' }),
    });
  });

  it('updateMatchScore PATCHes only the score/status fields', async () => {
    const update = { status: 'live' as const, homeScore: 1, awayScore: 0 };
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'm2',
        competition: 'Premier League',
        kickoff: '2026-09-05T10:00:00Z',
        status: 'live',
        home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
        away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
        homeScore: 1,
        awayScore: 0,
        minute: 12,
        events: [],
      }),
    );

    const repo = createHttpRepository(options);
    const match = await repo.updateMatchScore('m2', update);

    expect(match.status).toBe('live');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/teams/team-1/matches/m2', {
      method: 'PATCH',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify(update),
    });
  });

  it('updateMatchClock PATCHes periods and clears the legacy minute', async () => {
    const update = {
      status: 'live' as const,
      periods: [{ period: 'first' as const, startedAt: '2026-09-05T10:00:00.000Z' }],
    };
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'm2',
        competition: 'Premier League',
        kickoff: '2026-09-05T10:00:00Z',
        status: 'live',
        home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
        away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
        periods: update.periods,
        events: [],
      }),
    );

    const repo = createHttpRepository(options);
    const match = await repo.updateMatchClock('m2', update);

    expect(match.periods).toEqual(update.periods);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/teams/team-1/matches/m2', {
      method: 'PATCH',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ ...update, minute: null }),
    });
  });

  it('addEvent reads the timeline, appends and PATCHes it back in minute order', async () => {
    const existing = {
      id: 'e1',
      minute: 34,
      type: 'goal' as const,
      side: 'home' as const,
      player: 'Jamie Cole',
    };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'm1',
          competition: 'Premier League',
          kickoff: '2026-07-20T16:30:00Z',
          status: 'live',
          home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
          away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
          events: [existing],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'm1', events: [] }));

    const repo = createHttpRepository(options);
    await repo.addEvent('m1', {
      minute: 12,
      type: 'substitution',
      side: 'home',
      player: 'Andrés Vidal',
      detail: 'for Theo Banks',
      playerId: 'p7',
      relatedPlayerId: 'p4',
    });

    const [, patch] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(patch.body)) as { events: { minute: number; id: string }[] };
    // The new event sorts ahead of the existing one, and keeps the old one.
    expect(body.events.map((event) => event.minute)).toEqual([12, 34]);
    expect(body.events[1].id).toBe('e1');
    expect(body.events[0].id).toEqual(expect.stringMatching(/^e-/));
  });

  it('updateLineup reads the match, merges our side in and PATCHes lineups + formation', async () => {
    const awayLineup: Player[] = [
      { id: 'a1', name: 'Opponent Player', position: 'DF', squadNumber: 4 },
    ];
    const ourPlayers: Player[] = [{ id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 }];
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'm1',
          competition: 'Premier League',
          kickoff: '2026-07-20T16:30:00Z',
          status: 'live',
          home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
          away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
          events: [],
          lineups: { home: [], away: awayLineup },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'm1',
          competition: 'Premier League',
          kickoff: '2026-07-20T16:30:00Z',
          status: 'live',
          home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
          away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
          events: [],
          lineups: { home: ourPlayers, away: awayLineup },
          formation: '2-3-1',
        }),
      );

    const repo = createHttpRepository(options);
    const match = await repo.updateLineup('m1', {
      side: 'home',
      formation: '2-3-1',
      players: ourPlayers,
    });

    expect(match.formation).toBe('2-3-1');
    expect(match.lineups?.home).toEqual(ourPlayers);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/teams/team-1/matches/m1',
      {
        method: 'PATCH',
        headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
        body: JSON.stringify({
          lineups: { home: ourPlayers, away: awayLineup },
          formation: '2-3-1',
        }),
      },
    );
  });
});
