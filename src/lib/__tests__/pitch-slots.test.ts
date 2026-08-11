import { buildSlots, laneFor } from '../pitch-slots';

describe('laneFor', () => {
  it('centres a single slot', () => {
    expect(laneFor(0, 1)).toBe(0.5);
  });

  it('spreads two slots symmetrically around the centre', () => {
    expect(laneFor(0, 2)).toBeCloseTo(1 / 3);
    expect(laneFor(1, 2)).toBeCloseTo(2 / 3);
  });

  it('keeps every lane strictly between the touchlines', () => {
    for (let count = 1; count <= 5; count++) {
      for (let index = 0; index < count; index++) {
        const lane = laneFor(index, count);
        expect(lane).toBeGreaterThan(0);
        expect(lane).toBeLessThan(1);
      }
    }
  });

  it('orders lanes left to right by index', () => {
    for (let count = 2; count <= 5; count++) {
      const lanes = Array.from({ length: count }, (_, index) => laneFor(index, count));
      expect(lanes).toEqual([...lanes].sort((a, b) => a - b));
    }
  });
});

describe('buildSlots', () => {
  it('always centres the goalkeeper', () => {
    expect(buildSlots('2-3-1').find((slot) => slot.id === 'GK-0')?.lane).toBe(0.5);
  });

  it('gives each outfield slot a lane matching its index within its group', () => {
    const slots = buildSlots('2-3-1');
    const df = slots.filter((slot) => slot.group === 'DF');
    const mf = slots.filter((slot) => slot.group === 'MF');
    const fw = slots.filter((slot) => slot.group === 'FW');

    expect(df.map((slot) => slot.lane)).toEqual([laneFor(0, 2), laneFor(1, 2)]);
    expect(mf.map((slot) => slot.lane)).toEqual([laneFor(0, 3), laneFor(1, 3), laneFor(2, 3)]);
    expect(fw.map((slot) => slot.lane)).toEqual([laneFor(0, 1)]);
  });

  it('lays out correctly for every DF-MF-FW split from a 5- to an 11-a-side team', () => {
    for (let outfield = 4; outfield <= 10; outfield++) {
      for (let df = 1; df <= outfield - 2; df++) {
        for (let mf = 1; mf <= outfield - df - 1; mf++) {
          const fw = outfield - df - mf;
          if (fw < 1) continue;
          const slots = buildSlots(`${df}-${mf}-${fw}`);

          expect(slots).toHaveLength(outfield + 1);
          for (const group of ['DF', 'MF', 'FW'] as const) {
            const groupSlots = slots.filter((slot) => slot.group === group);
            const lanes = groupSlots.map((slot) => slot.lane);
            expect(lanes.every((lane) => lane > 0 && lane < 1)).toBe(true);
            expect(lanes).toEqual([...lanes].sort((a, b) => a - b));
          }
        }
      }
    }
  });

  it('gives a lone defender or forward a centred lane, same as the goalkeeper', () => {
    const slots = buildSlots('1-3-1');
    expect(slots.find((slot) => slot.id === 'DF-0')?.lane).toBe(0.5);
    expect(slots.find((slot) => slot.id === 'FW-0')?.lane).toBe(0.5);
  });
});
