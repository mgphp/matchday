import { playerMinutes } from '@/lib/player-minutes';
import type { MatchEvent, Player } from '@/lib/types';

const squad: Player[] = [
  { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 },
  { id: 'p2', name: 'Danny Whitmore', position: 'DF', squadNumber: 2 },
  { id: 'p3', name: 'Luca Marchetti', position: 'DF', squadNumber: 5 },
  { id: 'p4', name: 'Theo Banks', position: 'MF', squadNumber: 8 },
  { id: 'p5', name: 'Ryo Tanaka', position: 'MF', squadNumber: 10 },
  { id: 'p6', name: 'Jamie Cole', position: 'FW', squadNumber: 9 },
  { id: 'p7', name: 'Andrés Vidal', position: 'FW', squadNumber: 11 },
];
const starting = squad.slice(0, 5);

function sub(minute: number, on: string, off: string, side: 'home' | 'away' = 'home'): MatchEvent {
  return {
    id: `sub-${minute}-${on}`,
    minute,
    type: 'substitution',
    side,
    player: on,
    detail: `for ${off}`,
    playerId: on,
    relatedPlayerId: off,
  };
}

function minutesFor(events: MatchEvent[], elapsed: number) {
  const result = playerMinutes({ starting, events, side: 'home', squad, elapsed });
  return Object.fromEntries(result.map((entry) => [entry.player.id, entry.minutes]));
}

function onPitchIds(events: MatchEvent[], elapsed: number) {
  return playerMinutes({ starting, events, side: 'home', squad, elapsed })
    .filter((entry) => entry.isOnPitch)
    .map((entry) => entry.player.id);
}

describe('playerMinutes', () => {
  it('credits the starting lineup the full elapsed time', () => {
    expect(minutesFor([], 30)).toEqual({
      p1: 30,
      p2: 30,
      p3: 30,
      p4: 30,
      p5: 30,
      p6: 0,
      p7: 0,
    });
  });

  it('is all zeroes before kick-off', () => {
    expect(minutesFor([], 0)).toEqual({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0 });
  });

  it('splits the match between a player subbed off and the one who replaced them', () => {
    const totals = minutesFor([sub(20, 'p6', 'p4')], 50);

    expect(totals.p4).toBe(20);
    expect(totals.p6).toBe(30);
    // Everyone else played the lot.
    expect(totals.p1).toBe(50);
  });

  it('handles a player coming on, going off again, and coming back', () => {
    const events = [sub(10, 'p6', 'p4'), sub(20, 'p7', 'p6'), sub(40, 'p6', 'p7')];
    const totals = minutesFor(events, 60);

    // p6: on 10–20 and 40–60 = 30. p7: on 20–40 = 20. p4: on 0–10 = 10.
    expect(totals.p6).toBe(30);
    expect(totals.p7).toBe(20);
    expect(totals.p4).toBe(10);
  });

  it('applies substitutions in minute order regardless of array order', () => {
    const inOrder = minutesFor([sub(10, 'p6', 'p4'), sub(30, 'p7', 'p6')], 60);
    const reversed = minutesFor([sub(30, 'p7', 'p6'), sub(10, 'p6', 'p4')], 60);

    expect(reversed).toEqual(inOrder);
    expect(inOrder.p6).toBe(20);
  });

  it('does not count a substitution minute that is ahead of the clock', () => {
    // Coach typed 70 while the clock reads 50.
    const totals = minutesFor([sub(70, 'p6', 'p4')], 50);

    expect(totals.p4).toBe(50);
    expect(totals.p6).toBe(0);
  });

  it('freezes at full time — totals stop moving once elapsed stops', () => {
    const atFullTime = minutesFor([sub(25, 'p6', 'p4')], 50);
    expect(atFullTime.p4).toBe(25);
    expect(atFullTime.p6).toBe(25);
  });

  it('ignores the opponent’s substitutions', () => {
    expect(minutesFor([sub(20, 'p6', 'p4', 'away')], 50).p4).toBe(50);
  });

  it('ignores a substitution for someone not on the pitch', () => {
    const totals = minutesFor([sub(20, 'p7', 'p6')], 50);

    expect(totals.p6).toBe(0);
    expect(totals.p7).toBe(0);
  });

  it('tracks who is on the pitch alongside the totals', () => {
    expect(onPitchIds([], 30)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(onPitchIds([sub(20, 'p6', 'p4')], 30)).toEqual(['p1', 'p2', 'p3', 'p5', 'p6']);
  });

  it('returns every squad player, in squad order', () => {
    const result = playerMinutes({ starting, events: [], side: 'home', squad, elapsed: 10 });
    expect(result.map((entry) => entry.player.id)).toEqual(squad.map((player) => player.id));
  });

  it('still reports a starter who is missing from the squad list', () => {
    const guest: Player = { id: 'guest', name: 'Guest Keeper', position: 'GK', squadNumber: 12 };
    const result = playerMinutes({
      starting: [...starting, guest],
      events: [],
      side: 'home',
      squad,
      elapsed: 40,
    });

    expect(result.find((entry) => entry.player.id === 'guest')).toMatchObject({
      minutes: 40,
      isOnPitch: true,
    });
  });
});
