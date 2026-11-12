import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Match, Team } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

import { Badge } from './badge';
import { Card } from './card';

function kickoffLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function isSameUTCDate(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function kickoffDateLabel(iso: string) {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' });
  const month = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${weekday} ${day} ${month}`;
}

/** Kick-off time, prefixed with the date for fixtures not on the current day. */
function kickoffFullLabel(iso: string) {
  const time = kickoffLabel(iso);
  return isSameUTCDate(new Date(iso), new Date()) ? time : `${kickoffDateLabel(iso)}, ${time}`;
}

function statusBadge(match: Match) {
  switch (match.status) {
    case 'live':
      return <Badge label={`LIVE ${match.minute}'`} variant="live" />;
    case 'postponed':
      return <Badge label="Postponed" variant="alert" />;
    case 'finished':
      return <Badge label="FT" />;
    case 'scheduled':
      return <Badge label={kickoffFullLabel(match.kickoff)} />;
  }
}

function scoreline(match: Match) {
  if (match.status === 'scheduled' || match.status === 'postponed') {
    return `${match.home.name} v ${match.away.name}`;
  }
  return `${match.home.name} ${match.homeScore} – ${match.awayScore} ${match.away.name}`;
}

function statusText(match: Match) {
  switch (match.status) {
    case 'live':
      return `live, minute ${match.minute}`;
    case 'postponed':
      return 'postponed';
    case 'finished':
      return 'full time';
    case 'scheduled':
      return `kick-off ${kickoffFullLabel(match.kickoff)}`;
  }
}

type Result = 'W' | 'D' | 'L';

const RESULT_WORDS: Record<Result, string> = { W: 'won', D: 'drew', L: 'lost' };
const RESULT_BADGES = { W: 'default', D: 'neutral', L: 'danger' } as const;

/** Our result in a finished match, from our side's point of view. */
export function resultFor(match: Match, side: 'home' | 'away'): Result | undefined {
  if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) {
    return undefined;
  }
  const ours = side === 'home' ? match.homeScore : match.awayScore;
  const theirs = side === 'home' ? match.awayScore : match.homeScore;
  return ours > theirs ? 'W' : ours < theirs ? 'L' : 'D';
}

function TeamRow({ team, score, isOwn }: { team: Team; score?: number; isOwn: boolean }) {
  return (
    <View style={styles.teamRow}>
      {/* A crest (#58) slots in here, left of the name. */}
      <Text style={[styles.teamName, isOwn && styles.ownTeam]} numberOfLines={1}>
        {team.name}
      </Text>
      {score != null ? <Text style={[styles.score, isOwn && styles.ownTeam]}>{score}</Text> : null}
    </View>
  );
}

/**
 * One fixture in the Matches list. With `ownTeamId`, our side is highlighted,
 * the card says Home / Away, and a finished match shows W / D / L.
 */
export function MatchCard({
  match,
  ownTeamId,
  onPress,
}: {
  match: Match;
  ownTeamId?: string;
  onPress?: () => void;
}) {
  const side =
    match.home.id === ownTeamId ? 'home' : match.away.id === ownTeamId ? 'away' : undefined;
  const result = side ? resultFor(match, side) : undefined;
  const hasScore = match.status === 'live' || match.status === 'finished';
  const label = [
    scoreline(match),
    match.competition,
    side ? `${side} game` : undefined,
    result ? RESULT_WORDS[result] : undefined,
    statusText(match),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <View style={styles.row}>
          <View style={styles.badges}>
            {statusBadge(match)}
            {result ? <Badge label={result} variant={RESULT_BADGES[result]} /> : null}
          </View>
          <View style={styles.meta}>
            <Text style={styles.competition} numberOfLines={1}>
              {match.competition}
            </Text>
            {side ? <Badge label={side === 'home' ? 'H' : 'A'} variant="neutral" /> : null}
          </View>
        </View>
        <View>
          <TeamRow
            team={match.home}
            score={hasScore ? match.homeScore : undefined}
            isOwn={side === 'home'}
          />
          <TeamRow
            team={match.away}
            score={hasScore ? match.awayScore : undefined}
            isOwn={side === 'away'}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competition: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamName: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  score: {
    ...typography.heading,
    color: colors.text,
  },
  ownTeam: {
    color: colors.accent,
    fontWeight: '700',
  },
});
