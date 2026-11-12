import { canPlay } from '@/lib/positions';
import type { Group, Slot } from '@/lib/pitch-slots';
import type { Player } from '@/lib/types';

export const MIN_TEAM_SIZE = 5;
export const MAX_TEAM_SIZE = 11;

export const clampTeamSize = (size: number) =>
  Math.min(MAX_TEAM_SIZE, Math.max(MIN_TEAM_SIZE, size));

/** Players per side implied by a `DF-MF-FW` formation (keeper included), clamped. */
export function teamSizeOf(formation: string): number {
  return clampTeamSize(formation.split('-').reduce((sum, part) => sum + Number(part), 0) + 1);
}

/** Every way to split `outfield` players into 3 positive groups (DF-MF-FW). */
export function formationsFor(outfield: number): string[] {
  const options: string[] = [];
  for (let df = 1; df <= outfield - 2; df++) {
    for (let mf = 1; mf <= outfield - df - 1; mf++) {
      const fw = outfield - df - mf;
      if (fw >= 1) options.push(`${df}-${mf}-${fw}`);
    }
  }
  return options;
}

/** The most evenly-spread split — a reasonable default when nothing else applies. */
export function mostBalanced(options: string[]): string {
  return options.reduce((best, option) => {
    const variance = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    };
    const parts = (formation: string) => formation.split('-').map(Number);
    return variance(parts(option)) < variance(parts(best)) ? option : best;
  }, options[0]);
}

/**
 * Greedily places players into slots matching a position they play. Slot
 * identity within a group is arbitrary (defenders are interchangeable), so
 * this is all the "memory" a lineup needs — no positional metadata to store.
 */
export function placeByPosition(players: Player[], slots: Slot[]): Record<string, Player> {
  const assignments: Record<string, Player> = {};
  const remaining = [...players];
  const fill = (matches: (player: Player, slot: Slot) => boolean) => {
    for (const slot of slots) {
      if (assignments[slot.id]) continue;
      const index = remaining.findIndex((player) => matches(player, slot));
      if (index === -1) continue;
      assignments[slot.id] = remaining[index];
      remaining.splice(index, 1);
    }
  };
  // Main positions first, so a DF/MF only covers midfield once every slot
  // that wants a natural fit has had the chance to take one.
  fill((player, slot) => player.position === slot.group);
  fill((player, slot) => canPlay(player, slot.group));
  return assignments;
}

/**
 * Restores the exact slot a saved lineup used, rather than re-deriving one.
 * `slotMap` is keyed by the same ids `buildSlots` produces, so this only
 * finds anything when the formation hasn't changed since the save — the
 * caller falls back to `placeByPosition` otherwise (undefined `slotMap`, or a
 * player id it names no longer exists).
 */
export function placeBySlots(
  players: Player[],
  slotMap: Record<string, string> | undefined,
  slots: Slot[],
): Record<string, Player> | null {
  if (!slotMap) return null;
  const byId = new Map(players.map((player) => [player.id, player]));
  const assignments: Record<string, Player> = {};
  for (const slot of slots) {
    const playerId = slotMap[slot.id];
    const player = playerId !== undefined ? byId.get(playerId) : undefined;
    if (player) assignments[slot.id] = player;
  }
  return Object.keys(assignments).length === players.length ? assignments : null;
}

/** Pitch rows top to bottom: attack at the top, our keeper at the bottom. */
export const GROUP_ORDER: Group[] = ['FW', 'MF', 'DF', 'GK'];
