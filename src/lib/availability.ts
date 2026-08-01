import type { Match, Player } from '@/lib/types';

/**
 * Whether a player is available for this match.
 *
 * `Match.availablePlayerIds` being absent means "everyone" — that covers both
 * fixtures recorded before availability existed and the common case where the
 * whole squad turns up, so a coach never has to tick anyone in for a normal
 * week.
 */
export function isAvailable(match: Pick<Match, 'availablePlayerIds'>, playerId: string): boolean {
  return match.availablePlayerIds === undefined || match.availablePlayerIds.includes(playerId);
}

/** The players from `squad` who are available for this match, in squad order. */
export function availablePlayers<T extends Player>(
  match: Pick<Match, 'availablePlayerIds'>,
  squad: T[],
): T[] {
  if (match.availablePlayerIds === undefined) return squad;
  return squad.filter((player) => isAvailable(match, player.id));
}

/** The players from `squad` who are NOT available, in squad order. */
export function unavailablePlayers<T extends Player>(
  match: Pick<Match, 'availablePlayerIds'>,
  squad: T[],
): T[] {
  if (match.availablePlayerIds === undefined) return [];
  return squad.filter((player) => !isAvailable(match, player.id));
}
