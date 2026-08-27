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
    });

    expect(plan.target).toBe(40);
    expect(plan.subs.map((sub) => sub.minute)).toEqual([20, 20, 20, 40, 40, 40]);
    expect(plan.nextSub).toEqual(plan.subs[0]);
    expect(plan.projected.every((entry) => entry.minutes === 40)).toBe(true);
  });

  it('plans nothing when the whole squad starts', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(7, 7),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
    });

    expect(plan.subs).toEqual([]);
    expect(plan.nextSub).toBeUndefined();
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

    const plan = rotationPlan({ minutes, onPitchCount: 6, duration: 60, elapsed: 30 });

    expect(plan.subs.map((sub) => sub.minute)).toEqual([40, 40, 40]);
    expect(plan.projected.every((entry) => entry.minutes === 40)).toBe(true);
  });

  it('keeps minutes close to even when the counts do not divide cleanly', () => {
    const plan = rotationPlan({
      minutes: squadMinutes(10, 7),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
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
    });

    const mins = plan.subs.map((sub) => sub.minute);
    expect([...mins]).toEqual([...mins].sort((a, b) => a - b));
    expect(plan.subs.every((sub) => sub.minute > 12 && sub.minute < 50)).toBe(true);
  });

  it('skips a swap that would not move anyone toward their share', () => {
    // The only bench player has already had far more time than either starter,
    // so bringing them back on helps nobody.
    const minutes: PlayerMinutes[] = [
      { player: player('p0'), minutes: 0, isOnPitch: true },
      { player: player('p1'), minutes: 0, isOnPitch: true },
      { player: player('p2'), minutes: 30, isOnPitch: false },
    ];

    const plan = rotationPlan({ minutes, onPitchCount: 2, duration: 40, elapsed: 0 });

    expect(plan.subs).toEqual([]);
    expect(plan.projected.find((entry) => entry.player.id === 'p2')?.minutes).toBe(30);
  });
});
