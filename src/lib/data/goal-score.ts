import type { Match, MatchEvent } from '@/lib/types';

/**
 * Scoreline after a goal is recorded (`delta` 1) or deleted (`delta` -1), so
 * the score and the timeline can't drift apart. `undefined` for any other
 * event type — those leave the score alone. A missing score counts as 0 and
 * never goes below 0 (a hand-edited score may already be lower than the
 * goals on the timeline).
 */
export function scoreAfterGoal(
  match: Pick<Match, 'homeScore' | 'awayScore'>,
  event: Pick<MatchEvent, 'type' | 'side'>,
  delta: 1 | -1,
): { homeScore: number; awayScore: number } | undefined {
  if (event.type !== 'goal') return undefined;
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  return event.side === 'home'
    ? { homeScore: Math.max(0, homeScore + delta), awayScore }
    : { homeScore, awayScore: Math.max(0, awayScore + delta) };
}
