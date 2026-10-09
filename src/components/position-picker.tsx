import { Pressable, StyleSheet, Text, View } from 'react-native';

import { POSITIONS } from '@/lib/positions';
import type { PlayerPosition } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

/**
 * Multi-select position chips. `value` is in pick order — the first entry is
 * the player's main position, the rest are others they can cover.
 */
export function PositionPicker({
  value,
  onChange,
}: {
  value: readonly PlayerPosition[];
  onChange: (positions: PlayerPosition[]) => void;
}) {
  const toggle = (position: PlayerPosition) =>
    onChange(
      value.includes(position)
        ? value.filter((picked) => picked !== position)
        : [...value, position],
    );

  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>Positions</Text>
      <View style={styles.options}>
        {POSITIONS.map((position) => {
          const selected = value.includes(position);
          return (
            <Pressable
              key={position}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={position}
              onPress={() => toggle(position)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {position}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {value.length > 0
          ? `Main position: ${value[0]}. Pick every position they can play.`
          : 'Pick every position they can play — the first is their main one.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  optionLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
