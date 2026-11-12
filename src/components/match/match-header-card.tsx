import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CLOCK_ACTION_LABELS, runningPeriod, type ClockAction } from '@/lib/match-clock';
import type { RotationEntry } from '@/lib/rotation';
import type { RotationPlan } from '@/lib/rotation-plan';
import type { MatchDetail, MatchEvent } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

import { matchStyles as shared } from './match-styles';

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

function periodLabelFor(match: MatchDetail, clockAction: ClockAction | undefined) {
  if (match.status !== 'live') return undefined;
  const running = runningPeriod(match.periods);
  if (running) return running.period === 'first' ? '1st half' : '2nd half';
  return clockAction === 'second-half' ? 'Half time' : undefined;
}

/**
 * Status, score, scorers, the live clock and its next action, the match
 * actions, and the rotation hints (who's due on/off, next planned sub).
 */
export function MatchHeaderCard({
  match,
  minute,
  clockAction,
  isUpdatingClock,
  onClockAction,
  onEditMatch,
  onEditLineup,
  onRecordEvent,
  onSubstitute,
  nextOn,
  nextOff,
  plan,
}: {
  match: MatchDetail;
  minute: number;
  clockAction?: ClockAction;
  isUpdatingClock: boolean;
  onClockAction: (action: ClockAction) => void;
  onEditMatch: () => void;
  onEditLineup: () => void;
  /** Omitted when goals/cards can't be recorded yet. */
  onRecordEvent?: () => void;
  /** Omitted unless the match is live. */
  onSubstitute?: () => void;
  nextOn?: RotationEntry;
  nextOff?: RotationEntry;
  plan?: RotationPlan;
}) {
  const homeScorers = scorersFor(match.events, 'home');
  const awayScorers = scorersFor(match.events, 'away');
  const periodLabel = periodLabelFor(match, clockAction);
  const nextBreak = plan?.nextBreak;

  return (
    <Card>
      <View style={styles.headerRow}>
        {statusBadge(match, minute, clockAction)}
        <Text style={styles.competition}>{match.competition}</Text>
      </View>
      <Text style={styles.score}>{scoreline(match)}</Text>
      {homeScorers || awayScorers ? (
        <View style={styles.scorersRow}>
          <Text style={styles.scorersText}>{homeScorers}</Text>
          <Text style={[styles.scorersText, styles.scorersAway]}>{awayScorers}</Text>
        </View>
      ) : null}
      <Text style={styles.venue}>{match.venue}</Text>
      {match.status === 'live' ? (
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
          onPress={() => onClockAction(clockAction)}
          disabled={isUpdatingClock}
        />
      ) : null}
      <View style={styles.actionsRow}>
        <Button
          label="Edit match"
          variant="secondary"
          style={styles.action}
          onPress={onEditMatch}
        />
        <Button
          label="Edit lineup"
          variant="secondary"
          style={styles.action}
          onPress={onEditLineup}
        />
        {onRecordEvent ? (
          <Button
            label="Goal / card"
            variant="secondary"
            style={styles.action}
            onPress={onRecordEvent}
          />
        ) : null}
        {onSubstitute ? (
          <Button
            label="Substitution"
            variant="secondary"
            style={styles.action}
            onPress={onSubstitute}
          />
        ) : null}
      </View>
      {onSubstitute && (nextOn || nextOff) ? (
        <Text style={shared.hint}>
          {nextOff ? `Due off: ${nextOff.player.name}` : null}
          {nextOff && nextOn ? ' · ' : null}
          {nextOn ? `Due on: ${nextOn.player.name}` : null}
        </Text>
      ) : null}
      {nextBreak ? (
        <Text style={styles.nextSubHint}>
          {`Next sub ${nextBreak.minute}′`}
          {nextBreak.minute > minute ? ` (in ${nextBreak.minute - minute} min)` : ''}
          {`: ${[
            ...(nextBreak.keeperChange
              ? [`${nextBreak.keeperChange.keeper.squadNumber} in goal`]
              : []),
            ...nextBreak.subs.map((sub) => `${sub.on.squadNumber} for ${sub.off.squadNumber}`),
          ].join(', ')}`}
        </Text>
      ) : null}
    </Card>
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
  actionsRow: {
    flexDirection: 'row',
    // Up to four actions on a live match — wrap rather than squash them.
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    // Two per row on a phone: equal widths, never squashed below a readable
    // label. A lone last button stretches to fill its row.
    flexGrow: 1,
    flexBasis: '40%',
    paddingHorizontal: spacing.sm,
  },
  nextSubHint: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
  },
});
