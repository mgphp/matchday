export type Group = 'GK' | 'DF' | 'MF' | 'FW';

export interface Slot {
  id: string;
  group: Group;
  /** Horizontal position within the row: 0 (left touchline) to 1 (right touchline). */
  lane: number;
}

/** Evenly spreads `count` slots left to right, leaving margin at each touchline. */
export function laneFor(index: number, count: number): number {
  return (index + 1) / (count + 1);
}

export function buildSlots(formation: string): Slot[] {
  const [df, mf, fw] = formation.split('-').map(Number);
  const slots: Slot[] = [{ id: 'GK-0', group: 'GK', lane: 0.5 }];
  for (let i = 0; i < df; i++) slots.push({ id: `DF-${i}`, group: 'DF', lane: laneFor(i, df) });
  for (let i = 0; i < mf; i++) slots.push({ id: `MF-${i}`, group: 'MF', lane: laneFor(i, mf) });
  for (let i = 0; i < fw; i++) slots.push({ id: `FW-${i}`, group: 'FW', lane: laneFor(i, fw) });
  return slots;
}
