import { CLASH_WINDOW_MINUTES, describeFixture, findClashingFixture } from '@/lib/fixture-clash';
import type { Match, MatchStatus } from '@/lib/types';

const ownTeam = { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' };
const rivals = { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' };

function fixture(id: string, kickoff: string, status: MatchStatus = 'scheduled'): Match {
  return {
    id,
    competition: 'League',
    kickoff,
    venue: 'Bear Pit',
    status,
    home: ownTeam,
    away: rivals,
  };
}

const existing = [fixture('m1', '2026-09-05T10:00:00Z')];

describe('findClashingFixture', () => {
  it('finds a fixture at the same kickoff', () => {
    expect(findClashingFixture(existing, '2026-09-05T10:00:00Z')?.id).toBe('m1');
  });

  it('finds one just inside the window on either side', () => {
    expect(findClashingFixture(existing, '2026-09-05T11:59:00Z')?.id).toBe('m1');
    expect(findClashingFixture(existing, '2026-09-05T08:01:00Z')?.id).toBe('m1');
  });

  it('leaves a genuine double-header alone once outside the window', () => {
    expect(findClashingFixture(existing, '2026-09-05T12:00:00Z')).toBeUndefined();
    expect(findClashingFixture(existing, '2026-09-05T08:00:00Z')).toBeUndefined();
  });

  it('ignores a different day entirely', () => {
    expect(findClashingFixture(existing, '2026-09-06T10:00:00Z')).toBeUndefined();
  });

  it('ignores a postponed fixture — it is not being played', () => {
    const postponed = [fixture('m1', '2026-09-05T10:00:00Z', 'postponed')];
    expect(findClashingFixture(postponed, '2026-09-05T10:00:00Z')).toBeUndefined();
  });

  it('can skip a given match, so editing one does not clash with itself', () => {
    expect(
      findClashingFixture(existing, '2026-09-05T10:00:00Z', { ignoreMatchId: 'm1' }),
    ).toBeUndefined();
  });

  it('is undefined for an unparseable kickoff rather than throwing', () => {
    expect(findClashingFixture(existing, 'not-a-date')).toBeUndefined();
  });

  it('skips fixtures whose own kickoff is unparseable', () => {
    expect(
      findClashingFixture([fixture('m1', 'nonsense')], '2026-09-05T10:00:00Z'),
    ).toBeUndefined();
  });

  it('is undefined against an empty diary', () => {
    expect(findClashingFixture([], '2026-09-05T10:00:00Z')).toBeUndefined();
  });

  it('uses a two-hour window', () => {
    expect(CLASH_WINDOW_MINUTES).toBe(120);
  });
});

describe('describeFixture', () => {
  it('names the opponent and kickoff time when we are at home', () => {
    expect(describeFixture(fixture('m1', '2026-09-05T10:00:00Z'), ownTeam.id)).toBe(
      'Rivals FC at 10:00',
    );
  });

  it('names the opponent when we are away', () => {
    const away: Match = { ...fixture('m1', '2026-09-05T14:30:00Z'), home: rivals, away: ownTeam };
    expect(describeFixture(away, ownTeam.id)).toBe('Rivals FC at 14:30');
  });
});
