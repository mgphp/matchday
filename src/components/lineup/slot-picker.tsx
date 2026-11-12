import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Slot } from '@/lib/pitch-slots';
import type { Player } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

/** Who can fill a tapped pitch slot, plus Clear (when filled) and Cancel. */
export function SlotPicker({
  slot,
  current,
  eligible,
  onAssign,
  onClear,
  onCancel,
}: {
  slot: Slot;
  current?: Player;
  eligible: Player[];
  onAssign: (player: Player) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.picker}>
      <Text style={styles.pickerTitle}>{slot.group === 'GK' ? 'Goalkeeper' : slot.group}</Text>
      {current ? (
        <Pressable accessibilityRole="button" onPress={onClear} style={styles.pickerRow}>
          <Text style={styles.pickerClear}>Clear this position</Text>
        </Pressable>
      ) : null}
      {eligible.length === 0 ? (
        <Text style={styles.emptyText}>No available players for this position.</Text>
      ) : (
        eligible.map((player) => (
          <Pressable
            key={player.id}
            accessibilityRole="button"
            accessibilityLabel={player.name}
            onPress={() => onAssign(player)}
            style={styles.pickerRow}
          >
            <Text style={styles.pickerNumber}>{player.squadNumber}</Text>
            <Text style={styles.pickerName}>{player.name}</Text>
          </Pressable>
        ))
      )}
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.pickerRow}>
        <Text style={styles.pickerCancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: spacing.xs,
  },
  pickerTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  pickerNumber: {
    ...typography.body,
    color: colors.textSecondary,
    width: spacing.lg,
    textAlign: 'right',
  },
  pickerName: {
    ...typography.body,
    color: colors.text,
  },
  pickerClear: {
    ...typography.body,
    color: colors.danger,
  },
  pickerCancel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
