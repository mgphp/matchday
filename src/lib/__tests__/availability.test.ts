import { availablePlayers, isAvailable, unavailablePlayers } from '@/lib/availability';
import type { Player } from '@/lib/types';

const squad: Player[] = [
  { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 },
  { id: 'p2', name: 'Danny Whitmore', position: 'DF', squadNumber: 2 },
  { id: 'p3', name: 'Luca Marchetti', position: 'DF', squadNumber: 5 },
];

const ids = (players: Player[]) => players.map((player) => player.id);

describe('isAvailable', () => {
  it('treats an absent list as everyone being available', () => {
    expect(isAvailable({}, 'p1')).toBe(true);
    expect(isAvailable({ availablePlayerIds: undefined }, 'anyone-at-all')).toBe(true);
  });

  it('honours an explicit list', () => {
    const match = { availablePlayerIds: ['p1', 'p3'] };
    expect(isAvailable(match, 'p1')).toBe(true);
    expect(isAvailable(match, 'p2')).toBe(false);
  });

  it('treats an empty list as nobody available, not everybody', () => {
    expect(isAvailable({ availablePlayerIds: [] }, 'p1')).toBe(false);
  });
});

describe('availablePlayers', () => {
  it('returns the whole squad when no list is set', () => {
    expect(availablePlayers({}, squad)).toEqual(squad);
  });

  it('filters to the listed players, keeping squad order', () => {
    expect(ids(availablePlayers({ availablePlayerIds: ['p3', 'p1'] }, squad))).toEqual([
      'p1',
      'p3',
    ]);
  });

  it('ignores ids that are not in the squad', () => {
    expect(ids(availablePlayers({ availablePlayerIds: ['p1', 'ghost'] }, squad))).toEqual(['p1']);
  });
});

describe('unavailablePlayers', () => {
  it('is empty when no list is set — nobody is explicitly missing', () => {
    expect(unavailablePlayers({}, squad)).toEqual([]);
  });

  it('is the complement of the available list', () => {
    expect(ids(unavailablePlayers({ availablePlayerIds: ['p1'] }, squad))).toEqual(['p2', 'p3']);
  });

  it('partitions the squad exactly, with no player in both halves', () => {
    const match = { availablePlayerIds: ['p1', 'p3'] };
    const available = ids(availablePlayers(match, squad));
    const missing = ids(unavailablePlayers(match, squad));

    expect([...available, ...missing].sort()).toEqual(ids(squad).sort());
    expect(available.filter((id) => missing.includes(id))).toEqual([]);
  });
});
