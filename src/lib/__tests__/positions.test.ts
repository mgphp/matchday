import type { Player } from '@/lib/types';

import { canPlay, playerPositions, positionFields, positionsLabel } from '../positions';

const single: Player = { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 };
const versatile: Player = {
  id: 'p2',
  name: 'Danny Whitmore',
  position: 'DF',
  positions: ['DF', 'MF'],
  squadNumber: 2,
};

describe('playerPositions', () => {
  it('falls back to the main position for a player saved before positions existed', () => {
    expect(playerPositions(single)).toEqual(['GK']);
  });

  it('lists every position, main first', () => {
    expect(playerPositions(versatile)).toEqual(['DF', 'MF']);
  });

  it('keeps the main position first and unrepeated even if positions disagrees', () => {
    expect(playerPositions({ ...versatile, positions: ['MF', 'DF', 'FW'] })).toEqual([
      'DF',
      'MF',
      'FW',
    ]);
    expect(playerPositions({ ...versatile, positions: ['FW'] })).toEqual(['DF', 'FW']);
  });
});

describe('canPlay', () => {
  it('is true for any of a player’s positions and false otherwise', () => {
    expect(canPlay(versatile, 'DF')).toBe(true);
    expect(canPlay(versatile, 'MF')).toBe(true);
    expect(canPlay(versatile, 'FW')).toBe(false);
    expect(canPlay(single, 'DF')).toBe(false);
  });
});

describe('positionsLabel', () => {
  it('joins positions with a slash, main first', () => {
    expect(positionsLabel(single)).toBe('GK');
    expect(positionsLabel(versatile)).toBe('DF/MF');
  });
});

describe('positionFields', () => {
  it('stores only the main position for a single pick', () => {
    expect(positionFields(['FW'])).toEqual({ position: 'FW' });
  });

  it('makes the first pick the main position and keeps them all', () => {
    expect(positionFields(['MF', 'DF'])).toEqual({ position: 'MF', positions: ['MF', 'DF'] });
  });
});
