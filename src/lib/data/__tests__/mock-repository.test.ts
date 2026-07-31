import { mockRepository } from '../mock-repository';

describe('mockRepository', () => {
  it('returns fixtures with a live match carrying a score and minute', async () => {
    const fixtures = await mockRepository.getFixtures();
    expect(fixtures.length).toBeGreaterThan(0);
    const live = fixtures.find((match) => match.status === 'live');
    expect(live).toBeDefined();
    expect(live?.homeScore).toEqual(expect.any(Number));
    expect(live?.minute).toEqual(expect.any(Number));
    expect(
      fixtures.every((match) => typeof match.venue === 'string' && match.venue.length > 0),
    ).toBe(true);
  });

  it('returns a table ordered by position with points descending', async () => {
    const table = await mockRepository.getTable();
    const positions = table.map((standing) => standing.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const points = table.map((standing) => standing.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it('returns match detail with events and lineups for the live match', async () => {
    const detail = await mockRepository.getMatch('m1');
    expect(detail.status).toBe('live');
    expect(detail.events.length).toBeGreaterThan(0);
    expect(detail.lineups?.home.length).toBeGreaterThan(0);
    expect(detail.lineups?.away.length).toBeGreaterThan(0);
  });

  it('rejects for an unknown match id', async () => {
    await expect(mockRepository.getMatch('nope')).rejects.toThrow('No match with id nope');
  });

  it('returns a squad with unique squad numbers', async () => {
    const squad = await mockRepository.getSquad();
    const numbers = squad.map((player) => player.squadNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('appends a new player with a generated id and persists it', async () => {
    // getSquad() returns the live squad array reference, not a copy — capture
    // the count now, before addPlayer mutates that same array in place.
    const before = await mockRepository.getSquad();
    const beforeCount = before.length;

    const added = await mockRepository.addPlayer({
      name: 'New Kid',
      position: 'MF',
      squadNumber: 99,
    });

    expect(added.id).toBeTruthy();
    expect(added.name).toBe('New Kid');
    const after = await mockRepository.getSquad();
    expect(after.length).toBe(beforeCount + 1);
    expect(after).toContainEqual(added);
  });

  it('createMatch appends a scheduled fixture with no events', async () => {
    // getFixtures() returns the live array reference, not a copy — capture
    // the count now, before createMatch mutates that same array in place.
    const beforeCount = (await mockRepository.getFixtures()).length;
    const created = await mockRepository.createMatch({
      competition: 'League Cup',
      kickoff: '2026-09-05T10:00:00Z',
      venue: 'Bear Pit',
      home: { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR' },
      away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
    });

    expect(created.status).toBe('scheduled');
    expect(created.events).toEqual([]);
    expect(await mockRepository.getFixtures()).toHaveLength(beforeCount + 1);
  });

  it('updateMatchScore patches an existing match and rejects an unknown id', async () => {
    const updated = await mockRepository.updateMatchScore('m2', {
      status: 'live',
      homeScore: 1,
      awayScore: 0,
    });

    expect(updated).toMatchObject({ id: 'm2', status: 'live', homeScore: 1, awayScore: 0 });
    // Untouched fields survive the partial update.
    expect(updated.competition).toBe('Premier League');

    await expect(mockRepository.updateMatchScore('nope', { status: 'live' })).rejects.toThrow(
      'No match with id nope',
    );
  });

  it('updateMatchClock stores periods, drops the legacy minute and rejects an unknown id', async () => {
    const periods = [{ period: 'first' as const, startedAt: '2026-07-20T16:30:00.000Z' }];
    // m1 is the seeded live fixture carrying a hand-entered `minute`.
    const updated = await mockRepository.updateMatchClock('m1', { status: 'live', periods });

    expect(updated.periods).toEqual(periods);
    expect(updated.minute).toBeUndefined();

    await expect(
      mockRepository.updateMatchClock('nope', { status: 'live', periods }),
    ).rejects.toThrow('No match with id nope');
  });

  it('updatePlayer replaces the matching player in place', async () => {
    const updated = await mockRepository.updatePlayer({
      id: 'p2',
      name: 'Danny W.',
      position: 'DF',
      squadNumber: 20,
    });

    expect(updated.name).toBe('Danny W.');
    const squad = await mockRepository.getSquad();
    expect(squad.find((player) => player.id === 'p2')).toEqual(updated);
  });

  it('removePlayer drops the player from the squad', async () => {
    // Same live-reference gotcha as above: snapshot the count first.
    const beforeCount = (await mockRepository.getSquad()).length;
    await mockRepository.removePlayer('p2');
    const after = await mockRepository.getSquad();

    expect(after).toHaveLength(beforeCount - 1);
    expect(after.find((player) => player.id === 'p2')).toBeUndefined();
  });

  it('restorePlayer puts a removed player back with their original id', async () => {
    const before = await mockRepository.getSquad();
    const player = before.find((entry) => entry.id === 'p3')!;
    await mockRepository.removePlayer('p3');

    await mockRepository.restorePlayer(player);
    const after = await mockRepository.getSquad();

    expect(after.find((entry) => entry.id === 'p3')).toEqual(player);
  });

  it('restorePlayer is a no-op when the player is already there', async () => {
    const squad = await mockRepository.getSquad();
    const player = squad[0];
    const beforeCount = squad.length;

    await mockRepository.restorePlayer(player);

    expect(await mockRepository.getSquad()).toHaveLength(beforeCount);
  });

  it('updateLineup sets our side and formation without touching the other side', async () => {
    const away = (await mockRepository.getMatch('m1')).lineups?.away;
    const homeSquad = [{ id: 'p1', name: 'Sam Okafor', position: 'GK' as const, squadNumber: 1 }];

    const updated = await mockRepository.updateLineup('m1', {
      side: 'home',
      formation: '2-3-1',
      players: homeSquad,
    });

    expect(updated.formation).toBe('2-3-1');
    expect(updated.lineups?.home).toEqual(homeSquad);
    expect(updated.lineups?.away).toEqual(away);
  });

  it('updateLineup rejects an unknown match id', async () => {
    await expect(
      mockRepository.updateLineup('nope', { side: 'home', players: [] }),
    ).rejects.toThrow('No match with id nope');
  });
});
