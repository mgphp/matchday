import type { PlayerMinutes } from '@/lib/player-minutes';
import type { Player } from '@/lib/types';

/** A single planned swap at a match minute. */
export interface PlannedSub {
  /** Match minute the swap should happen at. */
  minute: number;
  /** Outfielder coming off. */
  off: Player;
  /** Outfielder coming on. */
  on: Player;
}

/** One projected finish, if the plan is followed to full time. */
export interface ProjectedMinutes {
  player: Player;
  minutes: number;
}

export interface RotationPlan {
  /** Even outfield share of the match, in minutes. */
  target: number;
  /** Remaining planned swaps, minute ascending. Empty when none are needed. */
  subs: PlannedSub[];
  /** The next swap, if any — `subs[0]`. */
  nextSub?: PlannedSub;
  /** Where each outfielder finishes if the plan is followed. */
  projected: ProjectedMinutes[];
}

export interface RotationPlanInput {
  /**
   * Minutes played so far for the **available outfield** players — the caller
   * excludes the goalkeeper and anyone not at the match. Already reflects the
   * substitutions recorded up to now (it is `playerMinutes` output, filtered).
   */
  minutes: PlayerMinutes[];
  /** Outfield slots on the pitch — the lineup size minus the keeper. */
  onPitchCount: number;
  /** Full-time length of the match, in minutes. */
  duration: number;
  /** The match minute now. */
  elapsed: number;
}

/**
 * A live substitution schedule that shares outfield minutes evenly.
 *
 * The match is split into equal segments — `ceil(available / benchCount)`, the
 * fewest that let every player take a turn on the bench — and at each break the
 * longest-on players swap for the longest-off. It is recomputed from the live
 * clock and the minutes already played, so a late kick-off or a missed swap
 * corrects itself on the next render rather than needing a fresh plan.
 *
 * With counts that don't divide cleanly (e.g. 10 available for 7 slots) the
 * result is close to even rather than exact — `projected` shows where everyone
 * actually lands so the coach can nudge it.
 *
 * Pure: the caller supplies `elapsed` from the clock and renders the result.
 */
export function rotationPlan({
  minutes,
  onPitchCount,
  duration,
  elapsed,
}: RotationPlanInput): RotationPlan {
  const available = minutes.length;
  const target =
    available > 0 && onPitchCount > 0 ? Math.round((duration * onPitchCount) / available) : 0;

  const benchCount = available - onPitchCount;
  // `benchCount` players sit at a time, so it takes `ceil(available / benchCount)`
  // equal segments to rotate everyone through the bench once. At least 2 when
  // there is a bench at all; 1 (no breaks) when the whole squad starts.
  const segments =
    benchCount > 0 && onPitchCount > 0 ? Math.max(2, Math.ceil(available / benchCount)) : 1;

  const breakMinutes =
    segments > 1
      ? Array.from({ length: segments - 1 }, (_, i) => Math.round((duration * (i + 1)) / segments))
      : [];

  // Simulate the rest of the match, accruing minutes for whoever is on.
  const state = minutes.map((entry) => ({
    player: entry.player,
    minutes: entry.minutes,
    onPitch: entry.isOnPitch,
  }));
  let clock = Math.min(elapsed, duration);
  const advanceTo = (minute: number) => {
    const to = Math.min(minute, duration);
    const delta = to - clock;
    if (delta > 0) {
      for (const entry of state) if (entry.onPitch) entry.minutes += delta;
      clock = to;
    }
  };

  const subs: PlannedSub[] = [];
  for (const breakMinute of breakMinutes) {
    if (breakMinute <= elapsed || breakMinute >= duration) continue;
    advanceTo(breakMinute);
    const coming = [...state]
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !entry.onPitch)
      .sort((a, b) => a.entry.minutes - b.entry.minutes || a.index - b.index);
    const leaving = [...state]
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.onPitch)
      .sort((a, b) => b.entry.minutes - a.entry.minutes || a.index - b.index);
    const swaps = Math.min(coming.length, leaving.length, onPitchCount);
    for (let i = 0; i < swaps; i++) {
      const off = leaving[i].entry;
      const on = coming[i].entry;
      // A swap that would not move anyone toward the target is noise — skip it.
      if (on.minutes >= off.minutes) continue;
      off.onPitch = false;
      on.onPitch = true;
      subs.push({ minute: breakMinute, off: off.player, on: on.player });
    }
  }
  advanceTo(duration);

  return {
    target,
    subs,
    nextSub: subs[0],
    projected: state.map((entry) => ({ player: entry.player, minutes: Math.round(entry.minutes) })),
  };
}
