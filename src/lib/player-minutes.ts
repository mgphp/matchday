import { substitutionsFor } from '@/lib/lineup-state';
import type { MatchEvent, Player } from '@/lib/types';

export interface PlayerMinutes {
  player: Player;
  /** Minutes played so far in this match. */
  minutes: number;
  /** Whether they are on the pitch right now. */
  isOnPitch: boolean;
}

export interface PlayerMinutesInput {
  /** Our starting lineup for this match. */
  starting: Player[];
  /** Every event on the match, including the opponent's. */
  events: MatchEvent[];
  /** Which side of this fixture is ours. */
  side: MatchEvent['side'];
  /** The full squad — players who never got on still appear, on zero. */
  squad: Player[];
  /** Minutes played in the match so far, from the clock. */
  elapsed: number;
}

/**
 * Minutes played per player, derived from the starting lineup, the recorded
 * substitutions and the match clock.
 *
 * Works in match-minute space throughout, so the half-time gap needs no
 * special handling: `elapsed` already excludes it, and substitution minutes
 * are match minutes too.
 *
 * Returned in squad order. Players never involved appear with zero minutes.
 */
export function playerMinutes({
  starting,
  events,
  side,
  squad,
  elapsed,
}: PlayerMinutesInput): PlayerMinutes[] {
  const totals = new Map<string, number>();
  /** Player id → the match minute they most recently came on. */
  const onSince = new Map<string, number>(starting.map((player) => [player.id, 0]));

  for (const event of substitutionsFor(events, side)) {
    // A minute typed ahead of the clock would otherwise credit time that has
    // not been played yet.
    const at = Math.min(event.minute, elapsed);
    const offId = event.relatedPlayerId!;
    const onId = event.playerId!;

    const offSince = onSince.get(offId);
    if (offSince === undefined) continue;
    totals.set(offId, (totals.get(offId) ?? 0) + Math.max(0, at - offSince));
    onSince.delete(offId);
    onSince.set(onId, at);
  }

  for (const [id, since] of onSince) {
    totals.set(id, (totals.get(id) ?? 0) + Math.max(0, elapsed - since));
  }

  // Squad order, but include anyone in the lineup who is somehow not in the
  // squad list (a stale squad fetch) rather than dropping them silently.
  const squadIds = new Set(squad.map((player) => player.id));
  const extras = starting.filter((player) => !squadIds.has(player.id));

  return [...squad, ...extras].map((player) => ({
    player,
    minutes: totals.get(player.id) ?? 0,
    isOnPitch: onSince.has(player.id),
  }));
}
