import type { Match, MatchPeriod, MatchPeriodName, MatchStatus } from '@/lib/types';

const MS_PER_MINUTE = 60_000;

/** Periods a match runs through, in the order the controls advance them. */
const PERIOD_ORDER: MatchPeriodName[] = ['first', 'second'];

/** The period currently running (no `endedAt`), if any. */
export function runningPeriod(periods: MatchPeriod[] | undefined): MatchPeriod | undefined {
  return periods?.find((period) => period.endedAt === undefined);
}

/**
 * Minutes played so far, summed across every recorded period.
 *
 * Half-time (the gap between one period ending and the next starting) is
 * excluded, because only time inside a period counts. A period with no
 * `endedAt` is still running and counts up to `now`.
 */
export function elapsedMinutes(periods: MatchPeriod[] | undefined, now: number): number {
  if (!periods || periods.length === 0) return 0;
  const playedMs = periods.reduce((total, period) => {
    const startedAt = Date.parse(period.startedAt);
    if (Number.isNaN(startedAt)) return total;
    const endedAt = period.endedAt === undefined ? now : Date.parse(period.endedAt);
    if (Number.isNaN(endedAt)) return total;
    // Guard against a clock skew or a bad timestamp producing negative time.
    return total + Math.max(0, endedAt - startedAt);
  }, 0);
  return Math.floor(playedMs / MS_PER_MINUTE);
}

/**
 * The minute to display for a match.
 *
 * Prefers the derived clock; falls back to the legacy hand-entered `minute`
 * for fixtures recorded before the clock existed.
 */
export function displayMinute(match: Match, now: number): number {
  if (match.periods && match.periods.length > 0) return elapsedMinutes(match.periods, now);
  return match.minute ?? 0;
}

/** The clock control a coach can press next, given what has been played. */
export type ClockAction = 'kick-off' | 'half-time' | 'second-half' | 'full-time';

export const CLOCK_ACTION_LABELS: Record<ClockAction, string> = {
  'kick-off': 'Kick off',
  'half-time': 'Half time',
  'second-half': 'Second half',
  'full-time': 'Full time',
};

/**
 * Which control to offer next, or `undefined` when the clock is done with
 * (full time played, or the fixture was postponed).
 */
export function nextClockAction(match: Match): ClockAction | undefined {
  if (match.status === 'postponed' || match.status === 'finished') return undefined;
  const periods = match.periods ?? [];
  if (periods.length === 0) return 'kick-off';
  const running = runningPeriod(periods);
  if (running) return running.period === 'first' ? 'half-time' : 'full-time';
  // Nothing running: either half time, or every period has been played.
  const played = periods.map((period) => period.period);
  const next = PERIOD_ORDER.find((period) => !played.includes(period));
  return next === undefined ? 'full-time' : 'second-half';
}

export interface ClockUpdate {
  status: MatchStatus;
  periods: MatchPeriod[];
}

/**
 * Apply a clock action, returning the new periods and match status.
 *
 * Pure — the caller supplies `now` and persists the result.
 */
export function applyClockAction(match: Match, action: ClockAction, now: number): ClockUpdate {
  const periods = match.periods ?? [];
  const at = new Date(now).toISOString();
  const stopRunning = () =>
    periods.map((period) => (period.endedAt === undefined ? { ...period, endedAt: at } : period));

  switch (action) {
    case 'kick-off':
      return { status: 'live', periods: [{ period: 'first', startedAt: at }] };
    case 'half-time':
      return { status: 'live', periods: stopRunning() };
    case 'second-half':
      return { status: 'live', periods: [...periods, { period: 'second', startedAt: at }] };
    case 'full-time':
      return { status: 'finished', periods: stopRunning() };
  }
}
