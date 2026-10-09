import type { Player, PlayerPosition } from '@/lib/types';

export const POSITIONS: readonly PlayerPosition[] = ['GK', 'DF', 'MF', 'FW'];

/**
 * Every position a player can play, main position first. Players saved before
 * `positions` existed only carry `position`, so this is the one place that
 * reads either shape.
 */
export function playerPositions(player: Player): PlayerPosition[] {
  const extras = (player.positions ?? []).filter((position) => position !== player.position);
  return [player.position, ...extras];
}

export function canPlay(player: Player, position: PlayerPosition): boolean {
  return playerPositions(player).includes(position);
}

/** e.g. "DF/MF" — main position first. */
export function positionsLabel(player: Player): string {
  return playerPositions(player).join('/');
}

/**
 * The position fields for a saved player: the first pick is the main position.
 * `positions` is left off for a single-position player so their record keeps
 * the shape it always had.
 */
export function positionFields(
  picked: readonly PlayerPosition[],
): Pick<Player, 'position' | 'positions'> {
  const [position, ...rest] = picked;
  return rest.length > 0 ? { position, positions: [...picked] } : { position };
}
