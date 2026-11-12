import type { PlayerMinutes } from '../player-minutes';
import { rotationPlan } from '../rotation-plan';
import type { Player } from '../types';

function player(id: string): Player {
  return { id, name: id.toUpperCase(), position: 'MF', squadNumber: Number(id.replace(/\D/g, '')) };
}

/** `n` players, the first `onPitch` of them on the pitch, all on `minutes`. */
function squadMinutes(n: number, onPitch: number, minutes = 0): PlayerMinutes[] {
  return Array.from({ length: n }, (_, i) => ({
    player: player(`p${i}`),
    minutes,
    isOnPitch: i < onPitch,
  }));
}

describe('rotationPlan', () => {
  it('splits an even squad into equal shifts that all finish on the target', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(9, 6),
      onPitchCount: 6,
      duration: 60,
      elapsed: 0,
      keeperId: 'gk',
    });

    expect(plan.target).toBe(40);
    expect(plan.subs.map((sub) => sub.minute)).toEqual([20, 20, 20, 40, 40, 40]);
    expect(plan.nextBreak?.subs).toEqual(plan.subs.slice(0, 3));
    expect(plan.projected.every((entry) => entry.minutes === 40)).toBe(true);
  });

  it('plans nothing when the whole squad starts', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(7, 7),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
      keeperId: 'gk',
    });

    expect(plan.subs).toEqual([]);
    expect(plan.nextBreak).toBeUndefined();
    expect(plan.projected.every((entry) => entry.minutes === 50)).toBe(true);
  });

  it('only schedules breaks still ahead of the clock', () => {
    // One swap already done: p0-2 came off at 20', p3-5 have been on since
    // kick-off, p6-8 came on at 20'. Now 30' in.
    const minutes: PlayerMinutes[] = [
      { player: player('p0'), minutes: 20, isOnPitch: false },
      { player: player('p1'), minutes: 20, isOnPitch: false },
      { player: player('p2'), minutes: 20, isOnPitch: false },
      { player: player('p3'), minutes: 30, isOnPitch: true },
      { player: player('p4'), minutes: 30, isOnPitch: true },
      { player: player('p5'), minutes: 30, isOnPitch: true },
      { player: player('p6'), minutes: 10, isOnPitch: true },
      { player: player('p7'), minutes: 10, isOnPitch: true },
      { player: player('p8'), minutes: 10, isOnPitch: true },
    ];

    const plan = rotationPlan({
      minutes,
      onPitchCount: 6,
      duration: 60,
      elapsed: 30,
      keeperId: 'gk',
    });

    expect(plan.subs.map((sub) => sub.minute)).toEqual([40, 40, 40]);
    expect(plan.projected.every((entry) => entry.minutes === 40)).toBe(true);
  });

  it('keeps minutes close to even when the counts do not divide cleanly', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(10, 7),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
      keeperId: 'gk',
    });

    expect(plan.target).toBe(35);
    expect(plan.subs.length).toBeGreaterThan(0);
    // The simulation conserves time: 7 on the pitch for 50 minutes.
    const total = plan.projected.reduce((sum, entry) => sum + entry.minutes, 0);
    expect(total).toBe(350);
    const played = plan.projected.map((entry) => entry.minutes);
    expect(Math.max(...played) - Math.min(...played)).toBeLessThanOrEqual(15);
    expect(plan.subs.every((sub) => sub.on.id !== sub.off.id)).toBe(true);
  });

  it('returns future subs in ascending minute order, within the match', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(11, 7),
      onPitchCount: 7,
      duration: 50,
      elapsed: 12,
      keeperId: 'gk',
    });

    const mins = plan.subs.map((sub) => sub.minute);
    expect([...mins]).toEqual([...mins].sort((a, b) => a - b));
    expect(plan.subs.every((sub) => sub.minute > 12 && sub.minute < 50)).toBe(true);
  });

  it('counts minutes already played, so everyone finishes level', () => {
    // The bench player has already had 30', so they only need a short spell.
    const minutes: PlayerMinutes[] = [
      { player: player('p0'), minutes: 0, isOnPitch: true },
      { player: player('p1'), minutes: 0, isOnPitch: true },
      { player: player('p2'), minutes: 30, isOnPitch: false },
    ];

    const plan = rotationPlan({
      minutes,
      onPitchCount: 2,
      duration: 40,
      elapsed: 0,
      keeperId: 'gk',
    });

    const played = plan.projected.map((entry) => entry.minutes);
    expect(Math.max(...played) - Math.min(...played)).toBeLessThanOrEqual(1);
  });

  it('times subs to the minute so uneven counts still split exactly', () => {
    // 7 outfielders for 6 places over 60' → 51.4' each: one sub every ~8.6'.
    const plan = rotationPlan({
      minutes: squadMinutes(7, 6),
      onPitchCount: 6,
      duration: 60,
      elapsed: 0,
      keeperId: 'gk',
    });

    expect(plan.breaks.map((b) => b.minute)).toEqual([9, 17, 26, 34, 43, 51]);
    expect(plan.breaks.every((b) => b.subs.length === 1)).toBe(true);
    const played = plan.projected.map((entry) => entry.minutes);
    expect(Math.max(...played) - Math.min(...played)).toBeLessThanOrEqual(1);
  });

  it('lists each player’s spells on the pitch', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(8, 6),
      onPitchCount: 6,
      duration: 60,
      elapsed: 0,
      keeperId: 'gk',
    });

    for (const { stints, minutes } of plan.projected) {
      expect(stints.reduce((sum, s) => sum + s.to - s.from, 0)).toBe(minutes);
      expect(minutes).toBe(45);
    }
    // Bench players come on part-way; nobody's spells overlap.
    expect(plan.projected.find((e) => e.player.id === 'p6')?.stints[0].from).toBeGreaterThan(0);
  });

  describe('goalkeeper', () => {
    /** 7-a-side: keeper p0 + 6 outfield on, `n - 7` on the bench, all on zero. */
    function sevenASide(n: number): PlayerMinutes[] {
      return squadMinutes(n, 7);
    }

    it('keeps a full-match keeper out of every swap and shares the outfield evenly', () => {
      const plan = rotationPlan({
        minutes: sevenASide(9),
        onPitchCount: 6,
        duration: 60,
        elapsed: 0,
        keeperId: 'p0',
      });

      expect(plan.swapsKeeper).toBe(false);
      expect(plan.keeperChange).toBeUndefined();
      expect(plan.subs.some((sub) => sub.on.id === 'p0' || sub.off.id === 'p0')).toBe(false);
      // 6 slots × 60′ shared by the 8 outfielders.
      expect(plan.target).toBe(45);
      expect(plan.projected.map((entry) => entry.player.id)).not.toContain('p0');
      expect(plan.projected.every((entry) => entry.minutes === 45)).toBe(true);
    });

    it('swaps the keeper at half time and evens everyone out, goal time included', () => {
      const plan = rotationPlan({
        minutes: sevenASide(9),
        onPitchCount: 6,
        duration: 60,
        elapsed: 0,
        keeperId: 'p0',
        secondKeeperId: 'p8',
      });

      expect(plan.swapsKeeper).toBe(true);
      expect(plan.keeperChange).toMatchObject({
        minute: 30,
        keeper: { id: 'p8' },
        previous: { id: 'p0' },
      });
      // Never two keepers, and 7 on the pitch the whole time.
      const total = plan.projected.reduce((sum, entry) => sum + entry.minutes, 0);
      expect(total).toBe(7 * 60);
      expect(plan.projected.find((e) => e.player.id === 'p0')?.inGoal).toBe(30);
      expect(plan.projected.find((e) => e.player.id === 'p8')?.inGoal).toBe(30);
      const played = plan.projected.map((entry) => entry.minutes);
      expect(Math.max(...played) - Math.min(...played)).toBeLessThanOrEqual(1);
    });

    it('brings the second keeper on at half time when they start on the bench', () => {
      const plan = rotationPlan({
        minutes: sevenASide(8),
        onPitchCount: 6,
        duration: 50,
        elapsed: 0,
        keeperId: 'p0',
        secondKeeperId: 'p7',
      });

      const halfTime = plan.breaks.find((b) => b.minute === 25);
      expect(halfTime?.keeperChange?.keeper.id).toBe('p7');
      // Before half time they still get an outfield turn like anyone else.
      expect(plan.subs.some((sub) => sub.on.id === 'p7' && sub.minute < 25)).toBe(true);
    });

    it('ignores a second keeper who is not available', () => {
      const plan = rotationPlan({
        minutes: sevenASide(9),
        onPitchCount: 6,
        duration: 60,
        elapsed: 0,
        keeperId: 'p0',
        secondKeeperId: 'missing',
      });

      expect(plan.swapsKeeper).toBe(false);
    });
  });
});
