import { isAvailable } from '@/lib/availability';
import { playerMinutes } from '@/lib/player-minutes';
import { dueOff, dueOn, rotation } from '@/lib/rotation';
import { rotationPlan } from '@/lib/rotation-plan';
import type { MatchDetail, Player } from '@/lib/types';

/**
 * Everything the match centre shows about game time for our side: minutes
 * played (split on pitch / bench / not available), who's due on/off, and the
 * forward sub plan (with an optional half-time keeper swap). Pure — the screen passes in the ticking minute.
 */
export function matchRotation({
  match,
  squad,
  side,
  minute,
  duration,
  secondKeeperId,
}: {
  match: MatchDetail;
  squad?: Player[];
  side: 'home' | 'away';
  minute: number;
  duration: number;
  /** Goes in goal at half time; omit when the keeper plays the full match. */
  secondKeeperId?: string;
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

  // Forward sub schedule. The keeper either plays the whole match (and is held
  // out of the maths) or hands over at half time, in which case both keepers
  // join the outfield rotation for their other half.
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
  const planMinutes = isPreMatch ? preMatchMinutes : availableMinutes;
  // Who could take over in goal: anyone available bar the starting keeper,
  // recognised keepers first.
  const keeperOptions = (planMinutes ?? [])
    .map((entry) => entry.player)
    .filter((player) => player.id !== keeper?.id)
    .sort((a, b) => Number(b.position === 'GK') - Number(a.position === 'GK'));
  const secondKeeper = keeperOptions.find((player) => player.id === secondKeeperId);
  const plan =
    (match.status === 'live' || isPreMatch) &&
    keeper &&
    planMinutes &&
    planMinutes.length > 1 &&
    outfieldOnPitch > 0
      ? rotationPlan({
          minutes: planMinutes,
          onPitchCount: outfieldOnPitch,
          duration,
          elapsed: minute,
          keeperId: keeper.id,
          secondKeeperId: secondKeeper?.id,
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
    secondKeeper,
    keeperOptions,
    plan,
  };
}
