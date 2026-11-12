import { isAvailable } from '@/lib/availability';
import { playerMinutes } from '@/lib/player-minutes';
import { dueOff, dueOn, rotation } from '@/lib/rotation';
import { rotationPlan } from '@/lib/rotation-plan';
import type { MatchDetail, Player } from '@/lib/types';

/**
 * Everything the match centre shows about game time for our side: minutes
 * played (split on pitch / bench / not available), who's due on/off, and the
 * forward sub plan. Pure — the screen passes in the ticking minute.
 */
export function matchRotation({
  match,
  squad,
  side,
  minute,
  duration,
}: {
  match: MatchDetail;
  squad?: Player[];
  side: 'home' | 'away';
  minute: number;
  duration: number;
}) {
  const lineup = match.lineups?.[side];
  // Minutes only mean something once the match is under way; before kick-off
  // every player sits on zero, which is just noise.
  const hasStarted = match.status === 'live' || match.status === 'finished';
  const minutesPlayed =
    hasStarted && lineup && squad
      ? playerMinutes({ starting: lineup, events: match.events, side, squad, elapsed: minute })
      : undefined;
  // Anyone not at this match is excluded before targets are worked out, so a
  // missing player doesn't drag everyone else's share down.
  const availableMinutes = minutesPlayed?.filter((entry) => isAvailable(match, entry.player.id));
  const missing = minutesPlayed?.filter((entry) => !isAvailable(match, entry.player.id)) ?? [];
  const rotationEntries = availableMinutes
    ? rotation({
        minutes: availableMinutes,
        onPitchCount: lineup?.length ?? 0,
        duration,
        elapsed: minute,
      })
    : undefined;

  // Forward sub schedule for even outfield minutes. The keeper is held out of
  // the maths (they can still be swapped by hand via the substitution modal).
  const keeper = lineup?.find((player) => player.position === 'GK') ?? lineup?.[0];
  const outfieldOnPitch = (lineup?.length ?? 0) - (keeper ? 1 : 0);
  // Before kick-off the same plan is worked out from the starting lineup with
  // everyone on zero, so the coach can see the whole match's subs in advance.
  const isPreMatch = match.status === 'scheduled';
  const preMatchMinutes =
    isPreMatch && lineup && lineup.length > 0 && squad
      ? playerMinutes({ starting: lineup, events: [], side, squad, elapsed: 0 }).filter((entry) =>
          isAvailable(match, entry.player.id),
        )
      : undefined;
  const outfieldMinutes = (isPreMatch ? preMatchMinutes : availableMinutes)?.filter(
    (entry) => entry.player.id !== keeper?.id,
  );
  const plan =
    (match.status === 'live' || isPreMatch) &&
    outfieldMinutes &&
    outfieldMinutes.length > 0 &&
    outfieldOnPitch > 0
      ? rotationPlan({
          minutes: outfieldMinutes,
          onPitchCount: outfieldOnPitch,
          duration,
          elapsed: minute,
        })
      : undefined;

  return {
    lineup,
    isPreMatch,
    hasMinutes: minutesPlayed !== undefined,
    onPitch: rotationEntries?.filter((entry) => entry.isOnPitch) ?? [],
    bench: rotationEntries?.filter((entry) => !entry.isOnPitch) ?? [],
    missing,
    nextOn: rotationEntries ? dueOn(rotationEntries) : undefined,
    nextOff: rotationEntries ? dueOff(rotationEntries) : undefined,
    keeper,
    plan,
  };
}
