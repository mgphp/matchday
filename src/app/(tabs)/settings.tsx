import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { repository } from '@/lib/data';
import { useFavouriteTeam } from '@/lib/favourite-team';
import { FORMAT_SIZES, defaultDurationFor, useMatchFormat } from '@/lib/match-format';
import { useTeam } from '@/lib/team-context';
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

const SIZE_OPTIONS = FORMAT_SIZES.map(String);
const SIZE_LABELS = Object.fromEntries(SIZE_OPTIONS.map((size) => [size, `${size}-a-side`]));

/** Team size and default match length, for every match without its own. */
function MatchFormatCard() {
  const team = useTeam();
  const { format, isLoaded, setTeamSize, setDurationMinutes } = useMatchFormat(team.id);
  const [duration, setDuration] = useState(String(format.durationMinutes));

  // Follow the stored value (load, or a size change resetting the length).
  const [syncedMinutes, setSyncedMinutes] = useState(format.durationMinutes);
  if (syncedMinutes !== format.durationMinutes) {
    setSyncedMinutes(format.durationMinutes);
    setDuration(String(format.durationMinutes));
  }

  if (!isLoaded) return <StateView state="loading" />;

  const handleDuration = (text: string) => {
    setDuration(text);
    const minutes = Number(text);
    if (text.length > 0 && Number.isInteger(minutes) && minutes > 0) setDurationMinutes(minutes);
  };

  return (
    <Card>
      <ChoiceChips
        label="Team size"
        options={SIZE_OPTIONS}
        optionLabels={SIZE_LABELS}
        value={String(format.teamSize)}
        onChange={(size) => setTeamSize(Number(size))}
      />
      <TextField
        label="Match length (minutes)"
        value={duration}
        onChangeText={handleDuration}
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>
        {`Used for any match without its own length. ${format.teamSize}-a-side usually plays ${defaultDurationFor(format.teamSize)} minutes; Edit match can still change one match.`}
      </Text>
    </Card>
  );
}

export default function SettingsScreen() {
  const { status, data, reload } = useData(repository.getTable);
  const { teamId, isLoaded, setFavouriteTeam } = useFavouriteTeam();

  return (
    <Screen>
      <SectionHeader title="Match format" variant="accent" />
      <MatchFormatCard />
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
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
