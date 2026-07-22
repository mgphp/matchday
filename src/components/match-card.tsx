import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/theme';
import type { Match } from '@/lib/types';

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

export function MatchCard({ match, onPress }: { match: Match; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${scoreline(match)}, ${match.competition}, ${statusText(match)}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <View style={styles.row}>
          {statusBadge(match)}
          <Text style={styles.competition}>{match.competition}</Text>
        </View>
        <Text style={styles.fixture}>{scoreline(match)}</Text>
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
  fixture: {
    ...typography.heading,
    color: colors.text,
  },
});
