import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PositionPicker } from '@/components/position-picker';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { playerPositions, positionFields } from '@/lib/positions';
import type { Player, PlayerPosition } from '@/lib/types';
import { colors, typography } from '@/theme/theme';

export function EditPlayerModal({
  visible,
  onClose,
  player,
  onSubmit,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  player: Player;
  onSubmit: (player: Player) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [name, setName] = useState(player.name);
  const [positions, setPositions] = useState<PlayerPosition[]>(() => playerPositions(player));
  const [squadNumber, setSquadNumber] = useState(player.squadNumber.toString());
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const parsedNumber = Number(squadNumber);
  const isComplete =
    name.trim().length > 0 &&
    positions.length > 0 &&
    squadNumber.length > 0 &&
    Number.isInteger(parsedNumber) &&
    parsedNumber > 0;

  const handleClose = () => {
    setError(undefined);
    setConfirmingRemove(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        id: player.id,
        name: name.trim(),
        ...positionFields(positions),
        squadNumber: parsedNumber,
      });
      onClose();
    } catch {
      setError('Could not save the player. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onRemove();
      onClose();
    } catch {
      setError('Could not remove the player. Try again.');
      setConfirmingRemove(false);
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
          <SectionHeader title="Edit player" variant="accent" />
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
          label={isSubmitting ? 'Saving…' : 'Save'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />
        <Button
          label={confirmingRemove ? 'Tap again to confirm removal' : 'Remove player'}
          variant="secondary"
          onPress={handleRemove}
          disabled={isSubmitting}
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
