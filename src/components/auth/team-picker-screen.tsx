import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import type { ManagedTeam } from '@/lib/coach-api';
import { colors, spacing, typography } from '@/theme/theme';

export function TeamPickerScreen({
  teams,
  onSelect,
}: {
  teams: ManagedTeam[];
  onSelect: (teamId: string) => void;
}) {
  return (
    <Screen>
      <SectionHeader title="Choose a team" variant="accent" />
      <Card style={styles.card}>
        {teams.map((team) => (
          <Pressable
            key={team.id}
            accessibilityRole="button"
            accessibilityLabel={team.name}
            onPress={() => onSelect(team.id)}
            style={styles.row}
          >
            <Text style={styles.name}>{team.name}</Text>
            <Text style={styles.shortName}>{team.shortName}</Text>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
  shortName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
