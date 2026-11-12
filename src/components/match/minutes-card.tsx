import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { SectionHeader } from '@/components/section-header';
import type { PlayerMinutes } from '@/lib/player-minutes';
import type { RotationEntry } from '@/lib/rotation';
import { colors, typography } from '@/theme/theme';

import { matchStyles as shared } from './match-styles';

const ROTATION_LABELS: Record<RotationEntry['status'], string> = {
  under: 'due on',
  'on-track': 'on track',
  over: 'due off',
};

function MinutesRow({ entry }: { entry: RotationEntry }) {
  return (
    <View
      accessibilityLabel={`${entry.player.name}, ${entry.minutes} minutes played of ${
        entry.target
      } target, ${entry.isOnPitch ? 'on the pitch' : 'on the bench'}, ${
        ROTATION_LABELS[entry.status]
      }`}
      style={shared.row}
    >
      <Text style={shared.number}>{entry.player.squadNumber}</Text>
      <Text style={[shared.name, !entry.isOnPitch && shared.nameBench]}>{entry.player.name}</Text>
      {entry.status !== 'on-track' ? (
        <Text style={entry.status === 'under' ? styles.under : styles.over}>
          {ROTATION_LABELS[entry.status]}
        </Text>
      ) : null}
      <Text style={shared.value}>
        {entry.minutes}
        <Text style={styles.target}>/{entry.target}&#8242;</Text>
      </Text>
    </View>
  );
}

/** Minutes played so far, grouped on pitch / bench / not available. */
export function MinutesCard({
  onPitch,
  bench,
  missing,
}: {
  onPitch: RotationEntry[];
  bench: RotationEntry[];
  missing: PlayerMinutes[];
}) {
  return (
    <Card>
      <SectionHeader title="Minutes played" variant="accent" />
      <Text style={shared.groupLabel}>On pitch</Text>
      {onPitch.map((entry) => (
        <MinutesRow key={entry.player.id} entry={entry} />
      ))}
      {bench.length > 0 ? (
        <>
          <Text style={shared.groupLabel}>Bench</Text>
          {bench.map((entry) => (
            <MinutesRow key={entry.player.id} entry={entry} />
          ))}
        </>
      ) : null}
      {missing.length > 0 ? (
        <>
          <Text style={shared.groupLabel}>Not available</Text>
          {missing.map((entry) => (
            <View
              key={entry.player.id}
              accessibilityLabel={`${entry.player.name}, not available for this match`}
              style={shared.row}
            >
              <Text style={shared.number}>{entry.player.squadNumber}</Text>
              <Text style={[shared.name, shared.nameUnavailable]}>{entry.player.name}</Text>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  target: {
    ...typography.caption,
    fontWeight: '400',
    color: colors.textDisabled,
  },
  under: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent,
  },
  over: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.alert,
  },
});
