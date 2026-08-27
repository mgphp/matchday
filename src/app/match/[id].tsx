import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EditLineupModal } from '@/components/edit-lineup-modal';
import { EditMatchModal } from '@/components/edit-match-modal';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { SubstitutionModal } from '@/components/substitution-modal';
import { repository } from '@/lib/data';
import {
  applyClockAction,
  CLOCK_ACTION_LABELS,
  displayMinute,
  nextClockAction,
  runningPeriod,
  type ClockAction,
} from '@/lib/match-clock';
import { isAvailable } from '@/lib/availability';
import { playerMinutes } from '@/lib/player-minutes';
import {
  DEFAULT_DURATION_MINUTES,
  dueOff,
  dueOn,
  rotation,
  type RotationEntry,
} from '@/lib/rotation';
import { rotationPlan, type PlannedSub } from '@/lib/rotation-plan';
import { useTeam } from '@/lib/team-context';
import type { MatchDetail, MatchEvent, Player } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { useNow } from '@/lib/use-now';
import { colors, spacing, typography } from '@/theme/theme';

/** How often a live match refetches in the background. */
const LIVE_POLL_MS = 30_000;
/** How often the derived clock re-renders while a period is running. */
const CLOCK_TICK_MS = 1_000;

function statusBadge(match: MatchDetail, minute: number, action: ClockAction | undefined) {
  switch (match.status) {
    case 'live':
      // Paused between periods — the clock is stopped, so say so rather than
      // showing a "LIVE" minute that isn't moving.
      return action === 'second-half' ? (
        <Badge label={`Half time ${minute}'`} variant="alert" />
      ) : (
        <Badge label={`LIVE ${minute}'`} variant="live" />
      );
    case 'postponed':
      return <Badge label="Postponed" variant="alert" />;
    case 'finished':
      return <Badge label="Full time" />;
    case 'scheduled':
      return <Badge label="Kick-off upcoming" />;
  }
}

function eventIcon(type: MatchEvent['type']) {
  switch (type) {
    case 'goal':
      return <Ionicons name="football" size={16} color={colors.accent} />;
    case 'yellow-card':
      return <View style={[styles.cardIcon, { backgroundColor: colors.alert }]} />;
    case 'red-card':
      return <View style={[styles.cardIcon, { backgroundColor: colors.danger }]} />;
    case 'substitution':
      return <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />;
  }
}

function EventRow({ event }: { event: MatchEvent }) {
  return (
    <View style={styles.eventRow}>
      <Text style={styles.minute}>{event.minute}&#8242;</Text>
      {eventIcon(event.type)}
      <Text style={styles.eventPlayer}>{event.player}</Text>
      {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
    </View>
  );
}

function LineupColumn({
  title,
  players,
  formation,
}: {
  title: string;
  players: Player[];
  formation?: string;
}) {
  return (
    <View style={styles.lineupColumn}>
      <Text style={styles.lineupTitle}>
        {title}
        {formation ? ` (${formation})` : ''}
      </Text>
      {players.map((player) => (
        <Text key={player.id} style={styles.lineupPlayer}>
          {player.squadNumber} {player.name}
        </Text>
      ))}
    </View>
  );
}

const ROTATION_LABELS: Record<RotationEntry['status'], string> = {
  under: 'due on',
  'on-track': 'on track',
  over: 'due off',
};

/** Planned subs bucketed by the minute they happen at, minute ascending. */
function subsByMinute(subs: PlannedSub[]): { minute: number; swaps: PlannedSub[] }[] {
  const groups = new Map<number, PlannedSub[]>();
  for (const sub of subs) {
    groups.set(sub.minute, [...(groups.get(sub.minute) ?? []), sub]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minute, swaps]) => ({ minute, swaps }));
}

function MinutesRow({ entry }: { entry: RotationEntry }) {
  return (
    <View
      accessibilityLabel={`${entry.player.name}, ${entry.minutes} minutes played of ${
        entry.target
      } target, ${entry.isOnPitch ? 'on the pitch' : 'on the bench'}, ${
        ROTATION_LABELS[entry.status]
      }`}
      style={styles.minutesRow}
    >
      <Text style={styles.minutesNumber}>{entry.player.squadNumber}</Text>
      <Text style={[styles.minutesName, !entry.isOnPitch && styles.minutesNameBench]}>
        {entry.player.name}
      </Text>
      {entry.status !== 'on-track' ? (
        <Text style={entry.status === 'under' ? styles.rotationUnder : styles.rotationOver}>
          {ROTATION_LABELS[entry.status]}
        </Text>
      ) : null}
      <Text style={styles.minutesValue}>
        {entry.minutes}
        <Text style={styles.minutesTarget}>/{entry.target}&#8242;</Text>
      </Text>
    </View>
  );
}

function scoreline(match: MatchDetail) {
  if (match.status === 'scheduled' || match.status === 'postponed') {
    return `${match.home.name} v ${match.away.name}`;
  }
  return `${match.home.name} ${match.homeScore} – ${match.awayScore} ${match.away.name}`;
}

/** e.g. "Callum Reed 12′, 79′\nJamie Cole 27′" — one line per scorer, minutes ascending. */
function scorersFor(events: MatchEvent[], side: MatchEvent['side']) {
  const minutesByPlayer = new Map<string, number[]>();
  for (const event of events) {
    if (event.type !== 'goal' || event.side !== side) continue;
    const minutes = minutesByPlayer.get(event.player) ?? [];
    minutes.push(event.minute);
    minutesByPlayer.set(event.player, minutes);
  }
  return [...minutesByPlayer.entries()]
    .map(
      ([player, minutes]) =>
        `${player} ${minutes
          .sort((a, b) => a - b)
          .map((minute) => `${minute}′`)
          .join(', ')}`,
    )
    .join('\n');
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getMatch = useCallback(() => repository.getMatch(String(id)), [id]);
  const { status, data, reload, refresh, isRefreshing } = useData(getMatch);
  const getSquad = useCallback(() => repository.getSquad(), []);
  const { data: squad } = useData(getSquad);
  const ownTeam = useTeam();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLineup, setIsEditingLineup] = useState(false);
  const [isSubstituting, setIsSubstituting] = useState(false);

  const isLive = data?.status === 'live';
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(refresh, LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [isLive, refresh]);

  // Only tick while a period is actually running — at half time the clock is
  // stopped, so re-rendering every second would show the same number.
  const now = useNow(CLOCK_TICK_MS, runningPeriod(data?.periods) !== undefined);
  const [isUpdatingClock, setIsUpdatingClock] = useState(false);
  const clockAction = data ? nextClockAction(data) : undefined;
  const handleClockAction = async (action: ClockAction) => {
    if (!data) return;
    setIsUpdatingClock(true);
    try {
      await repository.updateMatchClock(data.id, applyClockAction(data, action, Date.now()));
      await refresh();
    } finally {
      setIsUpdatingClock(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <StateView state="loading" />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen>
        <StateView state="error" message="Could not load this match." onRetry={reload} />
      </Screen>
    );
  }

  const homeScorers = scorersFor(data.events, 'home');
  const awayScorers = scorersFor(data.events, 'away');
  const ownSide = data.home.id === ownTeam.id ? 'home' : 'away';
  const minute = displayMinute(data, now);
  // Only offer a substitution once the match has actually started — before
  // kick-off "who is on the pitch" is just the starting lineup, edited via
  // the lineup editor instead.
  const canSubstitute = data.status === 'live';

  // Minutes only mean something once the match is under way; before kick-off
  // every player sits on zero, which is just noise.
  const hasStarted = data.status === 'live' || data.status === 'finished';
  const ourLineup = data.lineups?.[ownSide];
  const minutesPlayed =
    hasStarted && ourLineup && squad
      ? playerMinutes({
          starting: ourLineup,
          events: data.events,
          side: ownSide,
          squad,
          elapsed: minute,
        })
      : undefined;
  // Anyone not at this match is excluded before targets are worked out, so a
  // missing player doesn't drag everyone else's share down.
  const availableMinutes = minutesPlayed?.filter((entry) => isAvailable(data, entry.player.id));
  const missing = minutesPlayed?.filter((entry) => !isAvailable(data, entry.player.id)) ?? [];
  const duration = data.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const rotationEntries = availableMinutes
    ? rotation({
        minutes: availableMinutes,
        onPitchCount: ourLineup?.length ?? 0,
        duration,
        elapsed: minute,
      })
    : undefined;
  const onPitch = rotationEntries?.filter((entry) => entry.isOnPitch) ?? [];
  const bench = rotationEntries?.filter((entry) => !entry.isOnPitch) ?? [];
  const nextOn = rotationEntries ? dueOn(rotationEntries) : undefined;
  const nextOff = rotationEntries ? dueOff(rotationEntries) : undefined;

  // Forward sub schedule for even outfield minutes. The keeper is held out of
  // the maths (they can still be swapped by hand via the substitution modal).
  const keeper = ourLineup?.find((player) => player.position === 'GK') ?? ourLineup?.[0];
  const outfieldOnPitch = (ourLineup?.length ?? 0) - (keeper ? 1 : 0);
  const outfieldMinutes = availableMinutes?.filter((entry) => entry.player.id !== keeper?.id);
  const plan =
    data.status === 'live' && outfieldMinutes && outfieldMinutes.length > 0 && outfieldOnPitch > 0
      ? rotationPlan({
          minutes: outfieldMinutes,
          onPitchCount: outfieldOnPitch,
          duration,
          elapsed: minute,
        })
      : undefined;
  const nextBreak = plan?.nextSub
    ? plan.subs.filter((sub) => sub.minute === plan.nextSub!.minute)
    : [];

  const running = runningPeriod(data.periods);
  const periodLabel =
    data.status !== 'live'
      ? undefined
      : running
        ? running.period === 'first'
          ? '1st half'
          : '2nd half'
        : clockAction === 'second-half'
          ? 'Half time'
          : undefined;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <Card>
          <View style={styles.headerRow}>
            {statusBadge(data, minute, clockAction)}
            <Text style={styles.competition}>{data.competition}</Text>
          </View>
          <Text style={styles.score}>{scoreline(data)}</Text>
          {homeScorers || awayScorers ? (
            <View style={styles.scorersRow}>
              <Text style={styles.scorersText}>{homeScorers}</Text>
              <Text style={[styles.scorersText, styles.scorersAway]}>{awayScorers}</Text>
            </View>
          ) : null}
          <Text style={styles.venue}>{data.venue}</Text>
          {data.status === 'live' ? (
            <View
              style={styles.clockBlock}
              accessibilityLabel={`Match clock, ${minute} minutes${
                periodLabel ? `, ${periodLabel}` : ''
              }`}
            >
              <Text style={styles.clockMinute}>{minute}&#8242;</Text>
              {periodLabel ? <Text style={styles.clockPeriod}>{periodLabel}</Text> : null}
            </View>
          ) : null}
          {clockAction ? (
            <Button
              label={isUpdatingClock ? 'Saving…' : CLOCK_ACTION_LABELS[clockAction]}
              onPress={() => handleClockAction(clockAction)}
              disabled={isUpdatingClock}
            />
          ) : null}
          <View style={styles.actionsRow}>
            <Button label="Edit match" variant="secondary" onPress={() => setIsEditing(true)} />
            <Button
              label="Edit lineup"
              variant="secondary"
              onPress={() => setIsEditingLineup(true)}
            />
            {canSubstitute ? (
              <Button
                label="Substitution"
                variant="secondary"
                onPress={() => setIsSubstituting(true)}
              />
            ) : null}
          </View>
          {canSubstitute && (nextOn || nextOff) ? (
            <Text style={styles.rotationHint}>
              {nextOff ? `Due off: ${nextOff.player.name}` : null}
              {nextOff && nextOn ? ' · ' : null}
              {nextOn ? `Due on: ${nextOn.player.name}` : null}
            </Text>
          ) : null}
          {plan?.nextSub ? (
            <Text style={styles.nextSubHint}>
              {`Next sub ${plan.nextSub.minute}′`}
              {plan.nextSub.minute > minute ? ` (in ${plan.nextSub.minute - minute} min)` : ''}
              {`: ${nextBreak
                .map((sub) => `${sub.on.squadNumber} for ${sub.off.squadNumber}`)
                .join(', ')}`}
            </Text>
          ) : null}
        </Card>

        {minutesPlayed ? (
          <Card>
            <SectionHeader title="Minutes played" variant="accent" />
            <Text style={styles.minutesGroupLabel}>On pitch</Text>
            {onPitch.map((entry) => (
              <MinutesRow key={entry.player.id} entry={entry} />
            ))}
            {bench.length > 0 ? (
              <>
                <Text style={styles.minutesGroupLabel}>Bench</Text>
                {bench.map((entry) => (
                  <MinutesRow key={entry.player.id} entry={entry} />
                ))}
              </>
            ) : null}
            {missing.length > 0 ? (
              <>
                <Text style={styles.minutesGroupLabel}>Not available</Text>
                {missing.map((entry) => (
                  <View
                    key={entry.player.id}
                    accessibilityLabel={`${entry.player.name}, not available for this match`}
                    style={styles.minutesRow}
                  >
                    <Text style={styles.minutesNumber}>{entry.player.squadNumber}</Text>
                    <Text style={[styles.minutesName, styles.minutesNameUnavailable]}>
                      {entry.player.name}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </Card>
        ) : null}

        {plan && plan.subs.length > 0 ? (
          <Card>
            <SectionHeader title="Rotation plan" variant="accent" />
            <Text style={styles.planTarget}>
              Even share ≈ {plan.target}&#8242; each · goalkeeper isn&#8217;t rotated
            </Text>
            {subsByMinute(plan.subs).map(({ minute: at, swaps }) => (
              <View
                key={at}
                style={styles.planBreak}
                accessibilityLabel={`At ${at} minutes: ${swaps
                  .map((sub) => `${sub.on.name} on for ${sub.off.name}`)
                  .join(', ')}`}
              >
                <Text style={styles.planMinute}>{at}&#8242;</Text>
                <View style={styles.planSwaps}>
                  {swaps.map((sub) => (
                    <Text key={`${sub.on.id}-${sub.off.id}`} style={styles.planSwap}>
                      <Text style={styles.planOn}>
                        &#8593; {sub.on.squadNumber} {sub.on.name}
                      </Text>
                      {'   '}
                      <Text style={styles.planOff}>
                        &#8595; {sub.off.squadNumber} {sub.off.name}
                      </Text>
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        <Card>
          <SectionHeader title="Events" variant="accent" />
          {data.events.length === 0 ? (
            <Text style={styles.emptyText}>No events yet.</Text>
          ) : (
            data.events.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </Card>

        <Card>
          <SectionHeader title="Lineups" variant="accent" />
          {data.lineups ? (
            <View style={styles.lineupsRow}>
              <LineupColumn
                title={data.home.shortName}
                players={data.lineups.home}
                formation={ownSide === 'home' ? data.formation : undefined}
              />
              <LineupColumn
                title={data.away.shortName}
                players={data.lineups.away}
                formation={ownSide === 'away' ? data.formation : undefined}
              />
            </View>
          ) : (
            <Text style={styles.emptyText}>Teams not announced yet.</Text>
          )}
        </Card>
      </ScrollView>
      <EditMatchModal
        visible={isEditing}
        onClose={() => setIsEditing(false)}
        match={data}
        onSubmit={async (update) => {
          await repository.updateMatchScore(data.id, update);
          await refresh();
        }}
      />
      <EditLineupModal
        visible={isEditingLineup}
        onClose={() => setIsEditingLineup(false)}
        match={data}
        side={ownSide}
        onSubmit={async (update) => {
          await repository.updateLineup(data.id, update);
          await refresh();
        }}
      />
      <SubstitutionModal
        visible={isSubstituting}
        onClose={() => setIsSubstituting(false)}
        match={data}
        side={ownSide}
        minute={minute}
        onSubmit={async (event) => {
          await repository.addEvent(data.id, event);
          await refresh();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competition: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  score: {
    ...typography.title,
    color: colors.text,
  },
  scorersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scorersText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  scorersAway: {
    textAlign: 'right',
  },
  venue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  minutesGroupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  minutesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  minutesNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    width: spacing.lg,
  },
  minutesName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  minutesNameBench: {
    color: colors.textSecondary,
  },
  minutesNameUnavailable: {
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  minutesValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
  minutesTarget: {
    ...typography.caption,
    fontWeight: '400',
    color: colors.textDisabled,
  },
  rotationUnder: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent,
  },
  rotationOver: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.alert,
  },
  rotationHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nextSubHint: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
  },
  clockBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  clockMinute: {
    ...typography.title,
    fontWeight: '800',
    color: colors.text,
  },
  clockPeriod: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  planTarget: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  planBreak: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  planMinute: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
    width: spacing.xl,
  },
  planSwaps: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  planSwap: {
    ...typography.body,
    color: colors.text,
  },
  planOn: {
    color: colors.accent,
  },
  planOff: {
    color: colors.textSecondary,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  minute: {
    ...typography.caption,
    color: colors.textSecondary,
    width: spacing.lg,
  },
  eventPlayer: {
    ...typography.body,
    color: colors.text,
  },
  eventDetail: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  cardIcon: {
    width: 10,
    height: 14,
    borderRadius: 2,
  },
  lineupsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  lineupColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  lineupTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  lineupPlayer: {
    ...typography.body,
    color: colors.text,
  },
});
