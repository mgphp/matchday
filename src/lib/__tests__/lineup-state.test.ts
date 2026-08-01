import { playersOnBench, playersOnPitch, substitutionsFor } from '@/lib/lineup-state';
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
    id: `sub-${minute}`,
    minute,
    type: 'substitution',
    side,
    player: squad.find((player) => player.id === on)!.name,
    detail: `for ${squad.find((player) => player.id === off)!.name}`,
    playerId: on,
    relatedPlayerId: off,
  };
}

const names = (players: Player[]) => players.map((player) => player.name);

describe('substitutionsFor', () => {
  it('keeps only our side, in minute order', () => {
    const events = [sub(60, 'p6', 'p4'), sub(30, 'p7', 'p5'), sub(45, 'p6', 'p4', 'away')];
    expect(substitutionsFor(events, 'home').map((event) => event.minute)).toEqual([30, 60]);
  });

  it('ignores substitutions recorded without player ids', () => {
    const legacy: MatchEvent = {
      id: 'legacy',
      minute: 58,
      type: 'substitution',
      side: 'home',
      player: 'Andrés Vidal',
      detail: 'for Theo Banks',
    };
    expect(substitutionsFor([legacy], 'home')).toEqual([]);
  });

  it('ignores non-substitution events', () => {
    const goal: MatchEvent = {
      id: 'g1',
      minute: 12,
      type: 'goal',
      side: 'home',
      player: 'Jamie Cole',
      playerId: 'p6',
    };
    expect(substitutionsFor([goal], 'home')).toEqual([]);
  });
});

describe('playersOnPitch', () => {
  it('is the starting lineup when nothing has happened', () => {
    expect(names(playersOnPitch(starting, [], 'home', squad))).toEqual(names(starting));
  });

  it('swaps a substituted player for the one coming on', () => {
    const onPitch = playersOnPitch(starting, [sub(58, 'p7', 'p4')], 'home', squad);

    expect(names(onPitch)).toContain('Andrés Vidal');
    expect(names(onPitch)).not.toContain('Theo Banks');
    expect(onPitch).toHaveLength(starting.length);
  });

  it('keeps the substitute in the slot the outgoing player vacated', () => {
    const onPitch = playersOnPitch(starting, [sub(58, 'p7', 'p4')], 'home', squad);
    // p4 was 4th on; p7 takes that place rather than being appended.
    expect(onPitch[3].id).toBe('p7');
  });

  it('applies substitutions in minute order, not array order', () => {
    // Recorded out of order: p7 comes on for p4, then later goes off for p6.
    const events = [sub(70, 'p6', 'p7'), sub(58, 'p7', 'p4')];
    const onPitch = playersOnPitch(starting, events, 'home', squad);

    expect(names(onPitch)).toContain('Jamie Cole');
    expect(names(onPitch)).not.toContain('Andrés Vidal');
    expect(names(onPitch)).not.toContain('Theo Banks');
  });

  it('ignores a substitution for someone who is not on the pitch', () => {
    const onPitch = playersOnPitch(starting, [sub(58, 'p7', 'p6')], 'home', squad);
    expect(names(onPitch)).toEqual(names(starting));
  });

  it('ignores the opponent’s substitutions', () => {
    const onPitch = playersOnPitch(starting, [sub(58, 'p7', 'p4', 'away')], 'home', squad);
    expect(names(onPitch)).toEqual(names(starting));
  });
});

describe('playersOnBench', () => {
  it('is everyone in the squad who is not on the pitch', () => {
    expect(names(playersOnBench(squad, starting))).toEqual(['Jamie Cole', 'Andrés Vidal']);
  });

  it('puts a substituted player back on the bench', () => {
    const onPitch = playersOnPitch(starting, [sub(58, 'p7', 'p4')], 'home', squad);
    expect(names(playersOnBench(squad, onPitch))).toEqual(['Theo Banks', 'Jamie Cole']);
  });

  it('is empty when the whole squad is on the pitch', () => {
    expect(playersOnBench(squad, squad)).toEqual([]);
  });
});
