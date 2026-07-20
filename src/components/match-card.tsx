import { StyleSheet, Text, View } from 'react-native';

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

function statusBadge(match: Match) {
  switch (match.status) {
    case 'live':
      return <Badge label={`LIVE ${match.minute}'`} variant="live" />;
    case 'postponed':
      return <Badge label="Postponed" variant="alert" />;
    case 'finished':
      return <Badge label="FT" />;
    case 'scheduled':
      return <Badge label={kickoffLabel(match.kickoff)} />;
  }
}

function scoreline(match: Match) {
  if (match.status === 'scheduled' || match.status === 'postponed') {
    return `${match.home.name} v ${match.away.name}`;
  }
  return `${match.home.name} ${match.homeScore} – ${match.awayScore} ${match.away.name}`;
}

export function MatchCard({ match }: { match: Match }) {
  return (
    <Card>
      <View style={styles.row}>
        {statusBadge(match)}
        <Text style={styles.competition}>{match.competition}</Text>
      </View>
      <Text style={styles.fixture}>{scoreline(match)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
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
