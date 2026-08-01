import type { PlayerMinutes } from '@/lib/player-minutes';

/** Fallback full-time length when a match doesn't specify one. */
export const DEFAULT_DURATION_MINUTES = 90;

/**
 * How far off the pro-rata share a player can drift before it is worth
 * flagging. Small enough to be useful, large enough that the whole squad
 * isn't permanently amber between substitutions.
 */
export const TOLERANCE_MINUTES = 3;

export type RotationStatus = 'under' | 'on-track' | 'over';

export interface RotationEntry extends PlayerMinutes {
  /** Minutes this player should finish the match on for an even share. */
  target: number;
  /** Minutes they should be on by now, pro-rata to the clock. */
  expected: number;
  status: RotationStatus;
}

export interface RotationInput {
  /** Minutes played so far, per player — the output of `playerMinutes`. */
  minutes: PlayerMinutes[];
  /** How many of our players are on the pitch at once (the lineup size). */
  onPitchCount: number;
  /** Full-time length of this match in minutes. */
  duration: number;
  /** Minutes played so far, from the clock. */
  elapsed: number;
}

/**
 * An even share of game time per player, and whether each one is currently
 * under, on track, or over it.
 *
 * "Available" means the whole squad: there is no per-match availability model
 * yet, so a player who isn't at the game will drag the average down and show
 * as permanently `under`.
 */
export function rotation({
  minutes,
  onPitchCount,
  duration,
  elapsed,
}: RotationInput): RotationEntry[] {
  if (minutes.length === 0) return [];

  // Total playing time on offer, shared evenly across everyone available.
  const target = (duration * onPitchCount) / minutes.length;
  // Cap at the target: past full time, nobody is owed any more.
  const played = Math.min(elapsed, duration);
  const expected = (played * onPitchCount) / minutes.length;

  return minutes.map((entry) => ({
    ...entry,
    target: Math.round(target),
    expected: Math.round(expected),
    status:
      entry.minutes < expected - TOLERANCE_MINUTES
        ? 'under'
        : entry.minutes > expected + TOLERANCE_MINUTES
          ? 'over'
          : 'on-track',
  }));
}

/**
 * Who to bring on next: the player with the least game time among those on
 * the bench and behind their share. `undefined` when nobody is owed time.
 */
export function dueOn(entries: RotationEntry[]): RotationEntry | undefined {
  return entries
    .filter((entry) => !entry.isOnPitch && entry.status === 'under')
    .sort((a, b) => a.minutes - b.minutes)[0];
}

/**
 * Who to take off next: the player with the most game time among those on the
 * pitch and ahead of their share. `undefined` when nobody has had too much.
 */
export function dueOff(entries: RotationEntry[]): RotationEntry | undefined {
  return entries
    .filter((entry) => entry.isOnPitch && entry.status === 'over')
    .sort((a, b) => b.minutes - a.minutes)[0];
}
