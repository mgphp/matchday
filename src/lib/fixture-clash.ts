import type { Match } from '@/lib/types';

/**
 * How close two kickoffs have to be to count as a clash.
 *
 * Two hours covers a match plus getting there and away again. Wide enough to
 * catch "I already booked this morning", narrow enough that a genuine
 * afternoon double-header doesn't trip it.
 */
export const CLASH_WINDOW_MINUTES = 120;

const MS_PER_MINUTE = 60_000;

/**
 * An existing fixture close enough to a proposed kickoff to be worth
 * mentioning, or `undefined` when the slot looks free.
 *
 * Advisory only — a coach can have a genuine reason for two fixtures in a
 * window (tournaments, friendlies), so the caller warns rather than blocks.
 * Postponed fixtures are ignored: they are not being played.
 */
export function findClashingFixture(
  fixtures: Match[],
  kickoff: string,
  options: { ignoreMatchId?: string } = {},
): Match | undefined {
  const proposed = Date.parse(kickoff);
  if (Number.isNaN(proposed)) return undefined;

  return fixtures.find((fixture) => {
    if (fixture.id === options.ignoreMatchId) return false;
    if (fixture.status === 'postponed') return false;
    const existing = Date.parse(fixture.kickoff);
    if (Number.isNaN(existing)) return false;
    return Math.abs(existing - proposed) < CLASH_WINDOW_MINUTES * MS_PER_MINUTE;
  });
}

/** e.g. "Harbour City at 10:00" — enough to recognise the fixture in a warning. */
export function describeFixture(match: Match, ownTeamId: string): string {
  const opponent = match.home.id === ownTeamId ? match.away : match.home;
  const time = match.kickoff.slice(11, 16);
  return `${opponent.name} at ${time}`;
}
