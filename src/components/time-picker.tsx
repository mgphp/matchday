import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

const STEP_MINUTES = 15;
const COLUMNS = 4;

/** `HH:MM` slots from `fromHour` up to and including `toHour`:00, on 15-minute steps. */
export function timeSlots(fromHour: number, toHour: number): string[] {
  const slots: string[] = [];
  for (let minutes = fromHour * 60; minutes <= toHour * 60; minutes += STEP_MINUTES) {
    const hour = Math.floor(minutes / 60);
    slots.push(`${String(hour).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return slots;
}

/** Grassroots kick-offs: Saturday/Sunday mornings into early afternoon. */
const COMMON_SLOTS = timeSlots(9, 14);
/** Everything else a coach might need — early starts and evening games. */
const ALL_SLOTS = timeSlots(7, 21);

function rows<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += COLUMNS) {
    const row = items.slice(start, start + COLUMNS);
    result.push(row);
  }
  return result;
}

/**
 * A kick-off time field that opens an inline grid of 15-minute slots — same
 * no-overlay shape as `DatePicker`. Shows 09:00–14:00 by default, with
 * "More times" for 07:00–21:00. `value` is `HH:MM`, or empty when nothing is
 * picked.
 */
export function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const display = value || 'Choose a time';
  const slots = showAll || (value && !COMMON_SLOTS.includes(value)) ? ALL_SLOTS : COMMON_SLOTS;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.field}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{display}</Text>
        <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={styles.grid}>
          {rows(slots).map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((slot) => {
                const isSelected = slot === value;
                return (
                  <Pressable
                    key={slot}
                    accessibilityRole="button"
                    accessibilityLabel={slot}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(slot);
                      setOpen(false);
                    }}
                    style={[styles.slot, isSelected && styles.slotSelected]}
                  >
                    <Text style={[styles.slotLabel, isSelected && styles.slotLabelSelected]}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
              {Array.from({ length: COLUMNS - row.length }, (_, index) => (
                <View key={`pad-${index}`} style={styles.slotPad} />
              ))}
            </View>
          ))}
          {slots === COMMON_SLOTS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More times"
              onPress={() => setShowAll(true)}
              style={styles.more}
            >
              <Text style={styles.moreLabel}>More times</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textDisabled,
  },
  grid: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  slot: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  slotPad: {
    flex: 1,
  },
  slotSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slotLabel: {
    ...typography.body,
    color: colors.text,
  },
  slotLabelSelected: {
    color: colors.textOnAccent,
    fontWeight: '600',
  },
  more: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreLabel: {
    ...typography.body,
    color: colors.accent,
  },
});
