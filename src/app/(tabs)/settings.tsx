import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import { useFavouriteTeam } from '@/lib/favourite-team';
import type { Team } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { colors, spacing, typography } from '@/theme/theme';

function uniqueTeams(standings: { team: Team }[]) {
  const seen = new Map<string, Team>();
  for (const { team } of standings) {
    if (!seen.has(team.id)) seen.set(team.id, team);
  }
  return [...seen.values()];
}

function TeamRow({
  team,
  selected,
  onPress,
}: {
  team: Team;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${team.name}${selected ? ', selected' : ''}`}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.name}>{team.name}</Text>
      {selected ? <Ionicons name="checkmark-circle" color={colors.accent} size={22} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { status, data, reload } = useData(repository.getTable);
  const { teamId, isLoaded, setFavouriteTeam } = useFavouriteTeam();

  return (
    <Screen>
      <SectionHeader title="Favourite team" variant="accent" />
      {status === 'loading' || !isLoaded ? (
        <StateView state="loading" />
      ) : status === 'error' ? (
        <StateView state="error" message="Could not load teams." onRetry={reload} />
      ) : (
        <Card style={styles.card}>
          {uniqueTeams(data).map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              selected={team.id === teamId}
              onPress={() => setFavouriteTeam(team.id === teamId ? null : team.id)}
            />
          ))}
        </Card>
      )}
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
});
