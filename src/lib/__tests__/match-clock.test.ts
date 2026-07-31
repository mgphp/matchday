import {
  applyClockAction,
  displayMinute,
  elapsedMinutes,
  nextClockAction,
  runningPeriod,
} from '@/lib/match-clock';
import type { Match, MatchPeriod } from '@/lib/types';

const KICKOFF = Date.parse('2026-08-01T10:00:00Z');
const minutes = (n: number) => n * 60_000;

const baseMatch: Match = {
  id: 'm1',
  competition: 'League',
  kickoff: '2026-08-01T10:00:00Z',
  venue: 'Bear Pit',
  status: 'scheduled',
  home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
  away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
};

describe('elapsedMinutes', () => {
  it('is zero with no periods', () => {
    expect(elapsedMinutes(undefined, KICKOFF)).toBe(0);
    expect(elapsedMinutes([], KICKOFF)).toBe(0);
  });

  it('counts a running period up to now', () => {
    const periods: MatchPeriod[] = [{ period: 'first', startedAt: '2026-08-01T10:00:00Z' }];
    expect(elapsedMinutes(periods, KICKOFF + minutes(23))).toBe(23);
  });

  it('floors part-minutes', () => {
    const periods: MatchPeriod[] = [{ period: 'first', startedAt: '2026-08-01T10:00:00Z' }];
    expect(elapsedMinutes(periods, KICKOFF + minutes(23) + 59_000)).toBe(23);
  });

  it('excludes the half-time gap', () => {
    const periods: MatchPeriod[] = [
      { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
      { period: 'second', startedAt: '2026-08-01T10:40:00Z' },
    ];
    // 25 played + 15 at half time + 10 of the second half = 35 played.
    expect(elapsedMinutes(periods, KICKOFF + minutes(50))).toBe(35);
  });

  it('freezes once every period has ended', () => {
    const periods: MatchPeriod[] = [
      { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
      { period: 'second', startedAt: '2026-08-01T10:40:00Z', endedAt: '2026-08-01T11:05:00Z' },
    ];
    expect(elapsedMinutes(periods, KICKOFF + minutes(70))).toBe(50);
    expect(elapsedMinutes(periods, KICKOFF + minutes(600))).toBe(50);
  });

  it('stays at zero when a timestamp is out of order rather than going negative', () => {
    const periods: MatchPeriod[] = [
      { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T09:50:00Z' },
    ];
    expect(elapsedMinutes(periods, KICKOFF)).toBe(0);
  });
});

describe('displayMinute', () => {
  it('derives from periods when present', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [{ period: 'first', startedAt: '2026-08-01T10:00:00Z' }],
    };
    expect(displayMinute(match, KICKOFF + minutes(12))).toBe(12);
  });

  it('falls back to a legacy hand-entered minute', () => {
    const match: Match = { ...baseMatch, status: 'live', minute: 62 };
    expect(displayMinute(match, KICKOFF + minutes(12))).toBe(62);
  });

  it('prefers the derived clock over a stale legacy minute', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      minute: 62,
      periods: [{ period: 'first', startedAt: '2026-08-01T10:00:00Z' }],
    };
    expect(displayMinute(match, KICKOFF + minutes(12))).toBe(12);
  });

  it('is zero for a fixture that has not kicked off', () => {
    expect(displayMinute(baseMatch, KICKOFF)).toBe(0);
  });
});

describe('runningPeriod', () => {
  it('finds the period with no end', () => {
    const periods: MatchPeriod[] = [
      { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
      { period: 'second', startedAt: '2026-08-01T10:40:00Z' },
    ];
    expect(runningPeriod(periods)?.period).toBe('second');
  });

  it('is undefined at half time and at full time', () => {
    expect(
      runningPeriod([
        { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
      ]),
    ).toBeUndefined();
    expect(runningPeriod(undefined)).toBeUndefined();
  });
});

describe('nextClockAction', () => {
  it('offers kick off before the match starts', () => {
    expect(nextClockAction(baseMatch)).toBe('kick-off');
  });

  it('offers half time during the first half', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [{ period: 'first', startedAt: '2026-08-01T10:00:00Z' }],
    };
    expect(nextClockAction(match)).toBe('half-time');
  });

  it('offers the second half once the first has ended', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
      ],
    };
    expect(nextClockAction(match)).toBe('second-half');
  });

  it('offers full time during the second half', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
        { period: 'second', startedAt: '2026-08-01T10:40:00Z' },
      ],
    };
    expect(nextClockAction(match)).toBe('full-time');
  });

  it('offers full time when both periods are played but the match is still live', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
        { period: 'second', startedAt: '2026-08-01T10:40:00Z', endedAt: '2026-08-01T11:05:00Z' },
      ],
    };
    expect(nextClockAction(match)).toBe('full-time');
  });

  it('offers nothing for a finished or postponed match', () => {
    expect(nextClockAction({ ...baseMatch, status: 'finished' })).toBeUndefined();
    expect(nextClockAction({ ...baseMatch, status: 'postponed' })).toBeUndefined();
  });
});

describe('applyClockAction', () => {
  it('kicking off starts the first period and goes live', () => {
    expect(applyClockAction(baseMatch, 'kick-off', KICKOFF)).toEqual({
      status: 'live',
      periods: [{ period: 'first', startedAt: '2026-08-01T10:00:00.000Z' }],
    });
  });

  it('half time closes the running period and stays live', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [{ period: 'first', startedAt: '2026-08-01T10:00:00Z' }],
    };
    expect(applyClockAction(match, 'half-time', KICKOFF + minutes(25))).toEqual({
      status: 'live',
      periods: [
        {
          period: 'first',
          startedAt: '2026-08-01T10:00:00Z',
          endedAt: '2026-08-01T10:25:00.000Z',
        },
      ],
    });
  });

  it('the second half appends a period without touching the first', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
      ],
    };
    const update = applyClockAction(match, 'second-half', KICKOFF + minutes(40));
    expect(update.periods).toHaveLength(2);
    expect(update.periods[0].endedAt).toBe('2026-08-01T10:25:00Z');
    expect(update.periods[1]).toEqual({
      period: 'second',
      startedAt: '2026-08-01T10:40:00.000Z',
    });
  });

  it('full time closes the running period and finishes the match', () => {
    const match: Match = {
      ...baseMatch,
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-08-01T10:00:00Z', endedAt: '2026-08-01T10:25:00Z' },
        { period: 'second', startedAt: '2026-08-01T10:40:00Z' },
      ],
    };
    const update = applyClockAction(match, 'full-time', KICKOFF + minutes(65));
    expect(update.status).toBe('finished');
    expect(update.periods[1].endedAt).toBe('2026-08-01T11:05:00.000Z');
    expect(elapsedMinutes(update.periods, KICKOFF + minutes(600))).toBe(50);
  });
});
