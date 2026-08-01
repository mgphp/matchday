import type { PlayerMinutes } from '@/lib/player-minutes';
import { dueOff, dueOn, rotation, TOLERANCE_MINUTES } from '@/lib/rotation';
import type { Player } from '@/lib/types';

function player(id: string, squadNumber: number): Player {
  return { id, name: `Player ${id}`, position: 'MF', squadNumber };
}

/** A 9-player squad, 7 on the pitch — Mark's actual shape. */
function squadMinutes(values: number[], onPitchIds: string[] = []): PlayerMinutes[] {
  return values.map((minutes, index) => ({
    player: player(`p${index + 1}`, index + 1),
    minutes,
    isOnPitch: onPitchIds.includes(`p${index + 1}`),
  }));
}

const statuses = (entries: ReturnType<typeof rotation>) => entries.map((entry) => entry.status);

describe('rotation', () => {
  it('shares the total playing time evenly across the squad', () => {
    // 50 minutes x 7 on the pitch = 350 player-minutes over 9 players ≈ 39.
    const entries = rotation({
      minutes: squadMinutes([0, 0, 0, 0, 0, 0, 0, 0, 0]),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
    });

    expect(entries[0].target).toBe(39);
  });

  it('gives everyone the full duration when the squad is exactly the lineup', () => {
    const entries = rotation({
      minutes: squadMinutes([0, 0, 0, 0, 0, 0, 0]),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
    });

    expect(entries[0].target).toBe(50);
  });

  it('is empty for an empty squad rather than dividing by zero', () => {
    expect(rotation({ minutes: [], onPitchCount: 7, duration: 50, elapsed: 10 })).toEqual([]);
  });

  it('has everyone on track before kick-off', () => {
    const entries = rotation({
      minutes: squadMinutes([0, 0, 0, 0, 0, 0, 0, 0, 0]),
      onPitchCount: 7,
      duration: 50,
      elapsed: 0,
    });

    expect(statuses(entries)).toEqual(Array(9).fill('on-track'));
  });

  it('flags who is behind and who is ahead of their share', () => {
    // Halfway through: expected ≈ 19 minutes each.
    const entries = rotation({
      minutes: squadMinutes([25, 25, 25, 19, 0, 0, 0, 0, 0]),
      onPitchCount: 7,
      duration: 50,
      elapsed: 25,
    });

    expect(entries[0].expected).toBe(19);
    expect(entries[0].status).toBe('over');
    expect(entries[3].status).toBe('on-track');
    expect(entries[4].status).toBe('under');
  });

  it('treats anything inside the tolerance as on track', () => {
    const entries = rotation({
      minutes: squadMinutes([19 + TOLERANCE_MINUTES, 19 - TOLERANCE_MINUTES]),
      onPitchCount: 1,
      duration: 50,
      elapsed: 38,
    });

    expect(statuses(entries)).toEqual(['on-track', 'on-track']);
  });

  it('stops raising expectations once full time is reached', () => {
    const overrun = rotation({
      minutes: squadMinutes([0, 0, 0, 0, 0, 0, 0, 0, 0]),
      onPitchCount: 7,
      duration: 50,
      // Clock has run past full time (stoppage time).
      elapsed: 58,
    });

    expect(overrun[0].expected).toBe(overrun[0].target);
  });
});

describe('dueOn', () => {
  it('picks the least-played player on the bench who is behind', () => {
    const entries = rotation({
      minutes: squadMinutes(
        [25, 25, 25, 25, 25, 25, 25, 8, 2],
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
      ),
      onPitchCount: 7,
      duration: 50,
      elapsed: 25,
    });

    expect(dueOn(entries)?.player.id).toBe('p9');
  });

  it('ignores someone who is behind but already on the pitch', () => {
    const entries = rotation({
      minutes: squadMinutes([25, 25, 25, 25, 25, 25, 2], ['p7']),
      onPitchCount: 7,
      duration: 50,
      elapsed: 25,
    });

    expect(dueOn(entries)?.player.id).not.toBe('p7');
  });

  it('is undefined when nobody is owed time', () => {
    const entries = rotation({
      minutes: squadMinutes([20, 20, 20], []),
      onPitchCount: 3,
      duration: 50,
      elapsed: 20,
    });

    expect(dueOn(entries)).toBeUndefined();
  });
});

describe('dueOff', () => {
  it('picks the most-played player on the pitch who is ahead', () => {
    const entries = rotation({
      minutes: squadMinutes([25, 22, 0, 0, 0, 0, 0, 0, 0], ['p1', 'p2']),
      onPitchCount: 7,
      duration: 50,
      elapsed: 25,
    });

    expect(dueOff(entries)?.player.id).toBe('p1');
  });

  it('ignores someone who is ahead but already on the bench', () => {
    const entries = rotation({
      minutes: squadMinutes([25, 0, 0, 0, 0, 0, 0, 0, 0], []),
      onPitchCount: 7,
      duration: 50,
      elapsed: 25,
    });

    expect(dueOff(entries)).toBeUndefined();
  });
});
