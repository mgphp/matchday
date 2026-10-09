import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PositionPicker } from '@/components/position-picker';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { positionFields } from '@/lib/positions';
import type { Player, PlayerPosition } from '@/lib/types';
import { colors, typography } from '@/theme/theme';

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
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [squadNumber, setSquadNumber] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedNumber = Number(squadNumber);
  const isComplete =
    name.trim().length > 0 &&
    positions.length > 0 &&
    squadNumber.length > 0 &&
    Number.isInteger(parsedNumber) &&
    parsedNumber > 0;

  const reset = () => {
    setName('');
    setPositions([]);
    setSquadNumber('');
    setError(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (positions.length === 0) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        ...positionFields(positions),
        squadNumber: parsedNumber,
      });
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
        <PositionPicker value={positions} onChange={setPositions} />
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
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
