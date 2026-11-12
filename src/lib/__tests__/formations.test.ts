import { buildSlots } from '@/lib/pitch-slots';
import type { Player } from '@/lib/types';

import {
  formationsFor,
  mostBalanced,
  placeByPosition,
  placeBySlots,
  teamSizeOf,
} from '../formations';

const player = (id: string, position: Player['position']): Player =>
  ({ id, name: id, squadNumber: 1, position }) as Player;

describe('formations', () => {
  it('lists every DF-MF-FW split of the outfield', () => {
    expect(formationsFor(4)).toEqual(['1-1-2', '1-2-1', '2-1-1']);
  });

  it('picks the most even split', () => {
    expect(mostBalanced(formationsFor(6))).toBe('2-2-2');
  });

  it('reads the team size from a formation, clamped to 5–11', () => {
    expect(teamSizeOf('2-3-1')).toBe(7);
    expect(teamSizeOf('1-1-1')).toBe(5);
    expect(teamSizeOf('4-4-4')).toBe(11);
  });

  it('places players by their main position', () => {
    const slots = buildSlots('1-1-1');
    const placed = placeByPosition([player('f', 'FW'), player('g', 'GK')], slots);
    const groups = Object.entries(placed).map(
      ([slotId, p]) => [slots.find((s) => s.id === slotId)!.group, p.id] as const,
    );
    expect(groups).toEqual(
      expect.arrayContaining([
        ['GK', 'g'],
        ['FW', 'f'],
      ]),
    );
  });

  it('only restores saved slots when every player still fits', () => {
    const slots = buildSlots('1-1-1');
    const players = [player('g', 'GK')];
    const gkSlot = slots.find((s) => s.group === 'GK')!.id;
    expect(placeBySlots(players, { [gkSlot]: 'g' }, slots)).toEqual({ [gkSlot]: players[0] });
    expect(placeBySlots(players, { nope: 'g' }, slots)).toBeNull();
    expect(placeBySlots(players, undefined, slots)).toBeNull();
  });
});
