import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

/** Single-select row of chips, e.g. match status or home/away. */
export function ChoiceChips<T extends string>({
  label,
  options,
  optionLabels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  /** Display text per option; falls back to the raw option value. */
  optionLabels?: Partial<Record<T, string>>;
  value: T | null;
  onChange: (option: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option;
          const text = optionLabels?.[option] ?? option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={text}
              onPress={() => onChange(option)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {text}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
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
});
