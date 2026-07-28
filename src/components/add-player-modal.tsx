import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import type { Player, PlayerPosition } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

const POSITIONS: PlayerPosition[] = ['GK', 'DF', 'MF', 'FW'];

function PositionOption({
  position,
  selected,
  onPress,
}: {
  position: PlayerPosition;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={position}
      onPress={onPress}
      style={[styles.positionOption, selected && styles.positionOptionSelected]}
    >
      <Text style={[styles.positionLabel, selected && styles.positionLabelSelected]}>
        {position}
      </Text>
    </Pressable>
  );
}

export function AddPlayerModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (player: Omit<Player, 'id'>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const [squadNumber, setSquadNumber] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedNumber = Number(squadNumber);
  const isComplete =
    name.trim().length > 0 &&
    position !== null &&
    squadNumber.length > 0 &&
    Number.isInteger(parsedNumber) &&
    parsedNumber > 0;

  const reset = () => {
    setName('');
    setPosition(null);
    setSquadNumber('');
    setError(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!position) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), position, squadNumber: parsedNumber });
      reset();
      onClose();
    } catch {
      setError('Could not add the player. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <Screen>
        <View style={styles.header}>
          <SectionHeader title="Add player" variant="accent" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <TextField label="Name" value={name} onChangeText={setName} textContentType="name" />
        <View style={styles.positionGroup}>
          <Text style={styles.positionGroupLabel}>Position</Text>
          <View style={styles.positionOptions}>
            {POSITIONS.map((option) => (
              <PositionOption
                key={option}
                position={option}
                selected={position === option}
                onPress={() => setPosition(option)}
              />
            ))}
          </View>
        </View>
        <TextField
          label="Squad number"
          value={squadNumber}
          onChangeText={setSquadNumber}
          keyboardType="number-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Adding…' : 'Add'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    ...typography.body,
    color: colors.accent,
  },
  positionGroup: {
    gap: spacing.xs,
  },
  positionGroupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  positionOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  positionOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  positionOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  positionLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  positionLabelSelected: {
    color: colors.accent,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
