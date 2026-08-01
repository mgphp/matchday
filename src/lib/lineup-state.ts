import type { MatchEvent, Player } from '@/lib/types';

/** Substitutions for one side, oldest first. */
export function substitutionsFor(events: MatchEvent[], side: MatchEvent['side']): MatchEvent[] {
  return events
    .filter(
      (event) =>
        event.type === 'substitution' &&
        event.side === side &&
        event.playerId !== undefined &&
        event.relatedPlayerId !== undefined,
    )
    .sort((a, b) => a.minute - b.minute);
}

/**
 * Who is on the pitch right now: the starting lineup with substitutions
 * applied in minute order.
 *
 * Substitutions recorded before ids existed (`playerId`/`relatedPlayerId`
 * absent) are ignored — there is no reliable way to match them to a squad
 * entry, and guessing by name would silently corrupt the result.
 */
export function playersOnPitch(
  starting: Player[],
  events: MatchEvent[],
  side: MatchEvent['side'],
  squad: Player[],
): Player[] {
  const byId = new Map(squad.map((player) => [player.id, player]));
  const onPitch = starting.map((player) => player.id);

  for (const event of substitutionsFor(events, side)) {
    const offIndex = onPitch.indexOf(event.relatedPlayerId!);
    if (offIndex === -1) continue;
    onPitch[offIndex] = event.playerId!;
  }

  return onPitch
    .map((id) => byId.get(id) ?? starting.find((player) => player.id === id))
    .filter((player): player is Player => player !== undefined);
}

/** Squad players not currently on the pitch — the bench. */
export function playersOnBench(squad: Player[], onPitch: Player[]): Player[] {
  const onPitchIds = new Set(onPitch.map((player) => player.id));
  return squad.filter((player) => !onPitchIds.has(player.id));
}
