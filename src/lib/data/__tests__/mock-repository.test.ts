import { mockRepository } from '../mock-repository';

describe('mockRepository', () => {
  it('returns fixtures with a live match carrying a score and minute', async () => {
    const fixtures = await mockRepository.getFixtures();
    expect(fixtures.length).toBeGreaterThan(0);
    const live = fixtures.find((match) => match.status === 'live');
    expect(live).toBeDefined();
    expect(live?.homeScore).toEqual(expect.any(Number));
    expect(live?.minute).toEqual(expect.any(Number));
  });

  it('returns a table ordered by position with points descending', async () => {
    const table = await mockRepository.getTable();
    const positions = table.map((standing) => standing.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const points = table.map((standing) => standing.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it('returns a squad with unique squad numbers', async () => {
    const squad = await mockRepository.getSquad();
    const numbers = squad.map((player) => player.squadNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
