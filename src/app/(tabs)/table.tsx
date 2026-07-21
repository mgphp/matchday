import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { Standing } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { colors, spacing, typography } from '@/theme/theme';

const PROMOTION_SPOTS = 2;
const RELEGATION_SPOTS = 2;

function StandingRow({ standing, teamCount }: { standing: Standing; teamCount: number }) {
  const isPromotion = standing.position <= PROMOTION_SPOTS;
  const isRelegation = standing.position > teamCount - RELEGATION_SPOTS;

  return (
    <View
      testID={`standing-row-${standing.team.id}`}
      style={[styles.row, isPromotion && styles.promotion, isRelegation && styles.relegation]}
    >
      <Text style={styles.position}>{standing.position}</Text>
      <Text style={styles.team}>{standing.team.name}</Text>
      <Text style={styles.stat}>{standing.played}</Text>
      <Text style={styles.stat}>{standing.goalDifference}</Text>
      <Text style={styles.points}>{standing.points}</Text>
    </View>
  );
}

export default function TableScreen() {
  const { status, data, reload } = useData(repository.getTable);

  return (
    <Screen>
      {status === 'loading' ? (
        <StateView state="loading" />
      ) : status === 'error' ? (
        <StateView state="error" message="Could not load the table." onRetry={reload} />
      ) : data.length === 0 ? (
        <StateView state="empty" message="No standings yet." />
      ) : (
        <Card>
          <View style={styles.row}>
            <Text style={styles.position} />
            <Text style={[styles.team, styles.header]}>Team</Text>
            <Text style={[styles.stat, styles.header]}>P</Text>
            <Text style={[styles.stat, styles.header]}>GD</Text>
            <Text style={[styles.points, styles.header]}>Pts</Text>
          </View>
          <FlatList
            data={data}
            keyExtractor={(standing) => standing.team.id}
            renderItem={({ item }) => <StandingRow standing={item} teamCount={data.length} />}
            scrollEnabled={false}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  promotion: {
    backgroundColor: colors.accentMuted,
    borderLeftColor: colors.accent,
  },
  relegation: {
    backgroundColor: colors.alertMuted,
    borderLeftColor: colors.alert,
  },
  header: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  position: {
    ...typography.caption,
    color: colors.textSecondary,
    width: spacing.lg,
  },
  team: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  stat: {
    ...typography.body,
    color: colors.textSecondary,
    width: spacing.xl,
    textAlign: 'right',
  },
  points: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
    width: spacing.xl,
    textAlign: 'right',
  },
});
