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

/** A spell on the pitch, in whole match minutes: on at `from`, off at `to`. */
export interface Stint {
  from: number;
  to: number;
  /** In goal for this spell. */
  inGoal?: boolean;
}

/** One projected finish, if the plan is followed to full time. */
export interface ProjectedMinutes {
  player: Player;
  minutes: number;
  /** Minutes of `minutes` spent in goal. */
  inGoal: number;
  /** Planned spells from now to full time, in order. */
  stints: Stint[];
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

interface Spell {
  from: number;
  to: number;
  inGoal?: boolean;
}

const EPS = 1e-6;

/**
 * Even out minutes over a window: each player gets `clamp(level - base, lo, max)`
 * where `level` is found so the total is exactly `capacity` (or everyone gets
 * `max` if even that doesn't fill it).
 */
function levelFill(bases: number[], capacity: number, max: number, lo: number[] = []) {
  const needAt = (level: number) =>
    bases.map((base, i) => Math.min(max, Math.max(lo[i] ?? 0, level - base)));
  const sum = (needs: number[]) => needs.reduce((total, need) => total + need, 0);
  let low = Math.min(0, ...bases) - max;
  let high = Math.max(0, ...bases) + max * 2 + capacity;
  if (sum(needAt(high)) <= capacity + EPS) return { needs: needAt(high), level: high };
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (sum(needAt(mid)) < capacity) low = mid;
    else high = mid;
  }
  return { needs: needAt(high), level: high };
}

/**
 * Lay each player's minutes end to end across `lanes` pitch places, wrapping
 * at the window's end (McNaughton's rule). Every player gets exactly their
 * need, no one is in two places at once, and someone already on the pitch is
 * put at the start of each place so they stay on rather than being swapped
 * straight away. A player who wraps plays the start and the end of the window.
 */
function wrapWindow(
  from: number,
  to: number,
  players: { id: string; need: number; isOn: boolean }[],
): Map<string, Spell[]> {
  const width = to - from;
  const spells = new Map<string, Spell[]>();
  if (width <= EPS) return spells;
  const byNeed = (a: { need: number }, b: { need: number }) => b.need - a.need;
  const on = players.filter((p) => p.isOn && p.need > EPS).sort(byNeed);
  const bench = players.filter((p) => !p.isOn && p.need > EPS).sort(byNeed);

  let pos = 0;
  while (on.length + bench.length > 0) {
    const lane = Math.floor(pos / width + EPS);
    const offset = pos - lane * width;
    const nextBoundary = (lane + 1) * width;
    let pick;
    if (offset < EPS) {
      // Start of a pitch place: whoever's on now keeps it.
      pick = on.shift() ?? bench.shift()!;
    } else {
      // Mid-place: a bench player who fits before the place's end comes on;
      // otherwise an on-pitch player wraps round so they start the next one.
      const fits = bench.findIndex((p) => pos + p.need <= nextBoundary + EPS);
      pick = fits >= 0 ? bench.splice(fits, 1)[0] : (on.shift() ?? bench.shift()!);
    }
    const list = spells.get(pick.id) ?? [];
    if (offset + pick.need <= width + EPS) {
      list.push({ from: from + offset, to: from + Math.min(width, offset + pick.need) });
    } else {
      list.push({ from: from + offset, to });
      list.push({ from, to: from + (offset + pick.need - width) });
    }
    spells.set(pick.id, list);
    pos += pick.need;
  }
  return spells;
}

/** Round to whole minutes, sort and join touching spells. */
function tidy(spells: Spell[]): Stint[] {
  const rounded = spells
    .map((spell) => ({ ...spell, from: Math.round(spell.from), to: Math.round(spell.to) }))
    .filter((spell) => spell.to > spell.from)
    .sort((a, b) => a.from - b.from);
  const merged: Stint[] = [];
  for (const spell of rounded) {
    const last = merged[merged.length - 1];
    if (last && last.to >= spell.from && Boolean(last.inGoal) === Boolean(spell.inGoal)) {
      last.to = Math.max(last.to, spell.to);
    } else {
      merged.push(spell.inGoal ? { ...spell, inGoal: true } : { from: spell.from, to: spell.to });
    }
  }
  return merged;
}

/**
 * A live substitution schedule that shares minutes as evenly as possible.
 *
 * The goalkeeper is fixed: one keeper for the whole match, or one per half
 * when `secondKeeperId` is given. Without a swap the keeper is left out of the
 * maths and the outfield players share the outfield minutes. With a swap both
 * keepers join the outfield rotation for the half they're not in goal, and
 * everyone's total (goal + outfield) is evened out.
 *
 * Minutes are split exactly (to the nearest minute), and the sub times follow
 * from that rather than from fixed blocks: each player's share is laid end to
 * end across the pitch places, so a sub falls wherever one player's share runs
 * out. It is recomputed from the live clock and the minutes already played, so
 * a late or missed sub corrects itself on the next render; a sub that should
 * already have happened shows at the current minute.
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
  const half = duration / 2;
  const now = Math.min(Math.max(elapsed, 0), duration);
  const keeperAt = (minute: number) => (swapsKeeper && minute >= half ? secondKeeperId! : keeperId);

  // Without a swap the keeper sits outside the rotation entirely.
  const pool = swapsKeeper ? minutes : minutes.filter((entry) => entry.player.id !== keeperId);
  const ids = pool.map((entry) => entry.player.id);
  const played = new Map(pool.map((entry) => [entry.player.id, entry.minutes]));
  const spells = new Map<string, Spell[]>(ids.map((id) => [id, []]));
  const add = (id: string, list: Spell[] | undefined) => spells.get(id)?.push(...(list ?? []));
  const lanes = Math.max(0, onPitchCount);
  let target = 0;

  if (!swapsKeeper) {
    const { needs, level } = levelFill(
      ids.map((id) => played.get(id)!),
      lanes * (duration - now),
      duration - now,
    );
    target = pool.length > 0 ? (lanes * duration) / pool.length : 0;
    if (now > 0) target = level;
    const wrapped = wrapWindow(
      now,
      duration,
      pool.map((entry, i) => ({ id: entry.player.id, need: needs[i], isOn: entry.isOnPitch })),
    );
    for (const id of ids) add(id, wrapped.get(id));
  } else {
    const first = keeperId;
    const second = secondKeeperId!;
    const remaining = duration - now;
    const goalLeft = (id: string) =>
      id === first ? Math.max(0, half - now) : id === second ? duration - Math.max(half, now) : 0;
    // Everyone's fair total for the match, goal time included.
    const overall = levelFill(
      ids.map((id) => played.get(id)!),
      (lanes + 1) * remaining,
      remaining,
      ids.map(goalLeft),
    );
    target = overall.level;
    const isOnNow = new Set(pool.filter((e) => e.isOnPitch).map((e) => e.player.id));

    // First half (if any of it is left): the first keeper in goal, the second
    // keeper plays outfield for whatever their goal half doesn't cover.
    const afterFirst = new Map(played);
    let onAtHalf = isOnNow;
    if (now < half) {
      const width = half - now;
      add(first, [{ from: now, to: half, inGoal: true }]);
      afterFirst.set(first, played.get(first)! + width);
      const secondIndex = ids.indexOf(second);
      const secondNeed = Math.min(
        width,
        Math.max(0, overall.needs[secondIndex] - goalLeft(second)),
      );
      const others = ids.filter((id) => id !== first && id !== second);
      const othersFill = levelFill(
        others.map((id) => played.get(id)!),
        Math.max(0, lanes * width - secondNeed),
        width,
      );
      const need = new Map(others.map((id, i) => [id, othersFill.needs[i]]));
      need.set(second, secondNeed);
      const wrapped = wrapWindow(
        now,
        half,
        [...need].map(([id, n]) => ({ id, need: n, isOn: isOnNow.has(id) })),
      );
      onAtHalf = new Set([first]);
      for (const [id, list] of wrapped) {
        add(id, list);
        const total = list.reduce((sum, spell) => sum + spell.to - spell.from, 0);
        afterFirst.set(id, played.get(id)! + total);
        if (list.some((spell) => Math.abs(spell.to - half) < EPS)) onAtHalf.add(id);
      }
    }

    // Second half: the second keeper in goal, everyone else evened out.
    const from = Math.max(half, now);
    add(second, [{ from, to: duration, inGoal: true }]);
    const others = ids.filter((id) => id !== second);
    const fill = levelFill(
      others.map((id) => afterFirst.get(id)!),
      lanes * (duration - from),
      duration - from,
    );
    const wrapped = wrapWindow(
      from,
      duration,
      others.map((id, i) => ({ id, need: fill.needs[i], isOn: onAtHalf.has(id) })),
    );
    for (const id of others) add(id, wrapped.get(id));
  }

  const stints = new Map(ids.map((id) => [id, tidy(spells.get(id)!)]));
  const byId = new Map(pool.map((entry) => [entry.player.id, entry.player]));
  const onAt = (t: number) =>
    new Set(ids.filter((id) => stints.get(id)!.some((s) => s.from <= t && t < s.to)));

  // Walk every planned on/off minute and turn changes into subs.
  const times = [
    ...new Set(
      [...stints.values()]
        .flat()
        .flatMap((s) => [s.from, s.to])
        .concat(Math.round(now))
        .filter((t) => t >= Math.round(now) && t < duration),
    ),
  ].sort((a, b) => a - b);
  let before = new Set(pool.filter((e) => e.isOnPitch).map((e) => e.player.id));
  if (!swapsKeeper) before.delete(keeperId);
  let keeperBefore = swapsKeeper ? keeperAt(now) : undefined;
  const breaks: PlannedBreak[] = [];
  for (const t of times) {
    const after = onAt(t);
    const keeperNow = swapsKeeper
      ? ids.find((id) => stints.get(id)!.some((s) => s.inGoal && s.from <= t && t < s.to))
      : undefined;
    const coming = ids.filter((id) => after.has(id) && !before.has(id));
    const going = ids.filter((id) => before.has(id) && !after.has(id));
    // A keeper straight off the bench into goal is paired with the keeper
    // coming off, so the sub reads the way it happens.
    const first = (id: string | undefined) => (x: string) => (x === id ? -1 : 0);
    coming.sort((a, b) => first(keeperNow)(a) - first(keeperNow)(b));
    going.sort((a, b) => first(keeperBefore)(a) - first(keeperBefore)(b));
    const subs = coming.slice(0, going.length).map((on, i) => ({
      minute: t,
      on: byId.get(on)!,
      off: byId.get(going[i])!,
    }));
    const keeperChange =
      keeperNow && keeperBefore && keeperNow !== keeperBefore
        ? { minute: t, keeper: byId.get(keeperNow)!, previous: byId.get(keeperBefore)! }
        : undefined;
    if (subs.length > 0 || keeperChange) breaks.push({ minute: t, subs, keeperChange });
    before = after;
    if (keeperNow) keeperBefore = keeperNow;
  }

  return {
    target: Math.round(target),
    swapsKeeper,
    subs: breaks.flatMap((b) => b.subs),
    keeperChange: breaks.find((b) => b.keeperChange)?.keeperChange,
    breaks,
    nextBreak: breaks[0],
    projected: pool.map((entry) => {
      const planned = stints.get(entry.player.id)!;
      const future = planned.reduce((sum, s) => sum + s.to - s.from, 0);
      const goalFuture = planned.reduce((sum, s) => sum + (s.inGoal ? s.to - s.from : 0), 0);
      const goalPast = !swapsKeeper
        ? 0
        : entry.player.id === keeperId
          ? Math.min(now, half)
          : entry.player.id === secondKeeperId
            ? Math.max(0, now - half)
            : 0;
      return {
        player: entry.player,
        minutes: Math.round(entry.minutes + future),
        inGoal: swapsKeeper ? Math.round(goalPast + goalFuture) : 0,
        stints: planned,
      };
    }),
  };
}
