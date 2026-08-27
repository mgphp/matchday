import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

/**
 * A compact dropdown row: label on the left, current value + chevron on the
 * right. Tapping toggles an inline list of options — no overlay, so it nests
 * happily inside a modal or scroll view.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  /** Display text per option; falls back to the raw option value. */
  optionLabels?: Partial<Record<T, string>>;
  onChange: (option: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const textFor = (option: T) => optionLabels?.[option] ?? option;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${textFor(value)}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.row}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueGroup}>
          <Text style={styles.value}>{textFor(value)}</Text>
          <Ionicons name="chevron-expand" size={18} color={colors.textSecondary} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {options.map((option, index) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={textFor(option)}
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  index > 0 && styles.optionDivided,
                  selected && styles.optionSelected,
                ]}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {textFor(option)}
                </Text>
                {selected ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  menu: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  optionDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.accentMuted,
  },
  optionLabel: {
    ...typography.body,
    color: colors.text,
  },
  optionLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
});
