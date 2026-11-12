import type { PlayerMinutes } from '@/lib/player-minutes';
import type { Player } from '@/lib/types';

/** A single planned swap at a match minute: one player off the pitch, one on. */
export interface PlannedSub {
  /** Match minute the swap should happen at. */
  minute: number;
  /** Player coming off. */
  off: Player;
  /** Player coming on. */
  on: Player;
}

/** The half-time change of goalkeeper, when the keeper is swapped. */
export interface KeeperChange {
  minute: number;
  /** Goes in goal for the second half. */
  keeper: Player;
  /** Was in goal for the first half. */
  previous: Player;
}

/** One projected finish, if the plan is followed to full time. */
export interface ProjectedMinutes {
  player: Player;
  minutes: number;
  /** Minutes of `minutes` spent in goal. */
  inGoal: number;
}

/** Every change planned for one minute — what the coach does at that break. */
export interface PlannedBreak {
  minute: number;
  subs: PlannedSub[];
  keeperChange?: KeeperChange;
}

export interface RotationPlan {
  /** Even share of the match, in minutes, for everyone being rotated. */
  target: number;
  /** Whether the keeper changes at half time (both keepers then share time too). */
  swapsKeeper: boolean;
  /** Remaining planned swaps, minute ascending. Empty when none are needed. */
  subs: PlannedSub[];
  /** The half-time keeper change, if it is still ahead. */
  keeperChange?: KeeperChange;
  /** Remaining breaks (subs and keeper change together), minute ascending. */
  breaks: PlannedBreak[];
  /** The next break, if any — `breaks[0]`. */
  nextBreak?: PlannedBreak;
  /** Where each player finishes if the plan is followed (keeper included). */
  projected: ProjectedMinutes[];
}

export interface RotationPlanInput {
  /**
   * Minutes played so far for every **available** player, keepers included —
   * the caller drops anyone not at the match. Already reflects substitutions
   * recorded up to now (it is `playerMinutes` output, filtered).
   */
  minutes: PlayerMinutes[];
  /** Outfield slots on the pitch — the lineup size minus the keeper. */
  onPitchCount: number;
  /** Full-time length of the match, in minutes. */
  duration: number;
  /** The match minute now. */
  elapsed: number;
  /** In goal for the first half (or the whole match without a swap). */
  keeperId: string;
  /** In goal for the second half. Omit when the keeper plays the full match. */
  secondKeeperId?: string;
}

/**
 * A live substitution schedule that shares minutes evenly.
 *
 * The goalkeeper is fixed: one keeper for the whole match, or one per half
 * when `secondKeeperId` is given. Without a swap the keeper is left out of the
 * maths and the outfield players share the outfield minutes. With a swap both
 * keepers join the outfield rotation for the half they're not in goal, and
 * everyone's total (goal + outfield) is evened out.
 *
 * Each half is split into equal segments — enough that every outfield
 * candidate takes a turn on the bench — and at every break the players with
 * the fewest minutes go on (those already on stay on in a tie, so no pointless
 * swaps). It is recomputed from the live clock and the minutes already
 * played, so a late kick-off or a missed swap corrects itself on the next
 * render.
 *
 * With counts that don't divide cleanly the result is close to even rather
 * than exact — `projected` shows where everyone actually lands.
 *
 * Pure: the caller supplies `elapsed` from the clock and renders the result.
 */
export function rotationPlan({
  minutes,
  onPitchCount,
  duration,
  elapsed,
  keeperId,
  secondKeeperId,
}: RotationPlanInput): RotationPlan {
  const swapsKeeper =
    secondKeeperId !== undefined &&
    secondKeeperId !== keeperId &&
    minutes.some((entry) => entry.player.id === secondKeeperId);
  const half = Math.round(duration / 2);
  const keeperAt = (minute: number) => (swapsKeeper && minute >= half ? secondKeeperId! : keeperId);

  // Without a swap the keeper sits outside the rotation entirely.
  const pool = swapsKeeper ? minutes : minutes.filter((entry) => entry.player.id !== keeperId);
  const slots = onPitchCount + (swapsKeeper ? 1 : 0);
  const target =
    pool.length > 0 && onPitchCount > 0 ? Math.round((duration * slots) / pool.length) : 0;

  // Outfield candidates at any moment: everyone in the pool bar whoever's in goal.
  const candidates = swapsKeeper ? pool.length - 1 : pool.length;
  const benchCount = candidates - onPitchCount;
  const segmentsFor = (span: number) =>
    benchCount > 0 && onPitchCount > 0
      ? Math.max(swapsKeeper ? 1 : 2, Math.ceil((candidates / benchCount) * (span / duration)))
      : 1;
  const splits = (from: number, to: number) => {
    const count = segmentsFor(to - from);
    return Array.from({ length: count - 1 }, (_, i) =>
      Math.round(from + ((to - from) * (i + 1)) / count),
    );
  };
  const breakMinutes = swapsKeeper
    ? [...splits(0, half), half, ...splits(half, duration)]
    : splits(0, duration);

  type Role = 'goal' | 'pitch' | 'bench';
  const state = pool.map((entry, index) => ({
    player: entry.player,
    index,
    minutes: entry.minutes,
    inGoal: 0,
    role: (entry.player.id === keeperAt(elapsed)
      ? 'goal'
      : entry.isOnPitch
        ? 'pitch'
        : 'bench') as Role,
  }));
  // Goal time already played is unknown in detail; credit it from the clock.
  if (swapsKeeper) {
    for (const entry of state) {
      if (entry.player.id === keeperId) entry.inGoal = Math.min(elapsed, half);
      if (entry.player.id === secondKeeperId) entry.inGoal = Math.max(0, elapsed - half);
    }
  }

  let clock = Math.min(elapsed, duration);
  const advanceTo = (minute: number) => {
    const to = Math.min(minute, duration);
    const delta = to - clock;
    if (delta <= 0) return;
    for (const entry of state) {
      if (entry.role === 'bench') continue;
      entry.minutes += delta;
      if (entry.role === 'goal') entry.inGoal += delta;
    }
    clock = to;
  };

  const breaks: PlannedBreak[] = [];
  for (const breakMinute of breakMinutes) {
    if (breakMinute <= elapsed || breakMinute >= duration) continue;
    advanceTo(breakMinute);

    const wasOn = new Set(state.filter((e) => e.role !== 'bench').map((e) => e.player.id));
    const previousKeeper = state.find((e) => e.role === 'goal');
    const nextKeeperId = keeperAt(breakMinute);

    // Fewest minutes go on; in a tie whoever is already on stays on.
    const outfield = state
      .filter((e) => e.player.id !== nextKeeperId)
      .sort(
        (a, b) =>
          a.minutes - b.minutes ||
          Number(b.role !== 'bench') - Number(a.role !== 'bench') ||
          a.index - b.index,
      )
      .slice(0, onPitchCount);
    const outfieldIds = new Set(outfield.map((e) => e.player.id));
    for (const entry of state) {
      entry.role =
        entry.player.id === nextKeeperId
          ? 'goal'
          : outfieldIds.has(entry.player.id)
            ? 'pitch'
            : 'bench';
    }

    // A keeper straight off the bench into goal is paired with the keeper
    // coming off, so the sub reads the way it happens.
    const keeperFirst = (id: string | undefined) => (e: (typeof state)[number]) =>
      e.player.id === id ? -1 : 0;
    const coming = state
      .filter((e) => e.role !== 'bench' && !wasOn.has(e.player.id))
      .sort((x, y) => keeperFirst(nextKeeperId)(x) - keeperFirst(nextKeeperId)(y));
    const going = state
      .filter((e) => e.role === 'bench' && wasOn.has(e.player.id))
      .sort(
        (x, y) =>
          keeperFirst(previousKeeper?.player.id)(x) - keeperFirst(previousKeeper?.player.id)(y),
      );
    // The pitch holds the same number before and after, so these pair up.
    const subs = coming
      .slice(0, going.length)
      .map((on, i) => ({ minute: breakMinute, on: on.player, off: going[i].player }));
    const keeper = state.find((e) => e.role === 'goal');
    const keeperChange =
      keeper && previousKeeper && keeper !== previousKeeper
        ? { minute: breakMinute, keeper: keeper.player, previous: previousKeeper.player }
        : undefined;
    if (subs.length > 0 || keeperChange) breaks.push({ minute: breakMinute, subs, keeperChange });
  }
  advanceTo(duration);

  return {
    target,
    swapsKeeper,
    subs: breaks.flatMap((b) => b.subs),
    keeperChange: breaks.find((b) => b.keeperChange)?.keeperChange,
    breaks,
    nextBreak: breaks[0],
    projected: state.map((entry) => ({
      player: entry.player,
      minutes: Math.round(entry.minutes),
      inGoal: swapsKeeper ? Math.round(entry.inGoal) : 0,
    })),
  };
}
