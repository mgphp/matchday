import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { repository } from '@/lib/data';
import type { LineupUpdate } from '@/lib/data/repository';
import type { MatchDetail, Player } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

function PlayerOption({
  player,
  selected,
  onPress,
}: {
  player: Player;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${player.name} ${selected ? 'from' : 'to'} the lineup`}
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Text style={styles.number}>{player.squadNumber}</Text>
      <Text style={styles.name}>{player.name}</Text>
      <Text style={styles.position}>{player.position}</Text>
    </Pressable>
  );
}

export function EditLineupModal({
  visible,
  onClose,
  match,
  side,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  match: MatchDetail;
  /** Which side of this fixture is ours. */
  side: 'home' | 'away';
  onSubmit: (update: LineupUpdate) => Promise<void>;
}) {
  const [squad, setSquad] = useState<Player[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((match.lineups?.[side] ?? []).map((player) => player.id)),
  );
  const [formation, setFormation] = useState(match.formation ?? '');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    repository
      .getSquad()
      .then((result) => {
        if (cancelled) return;
        setSquad(result);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  const handleSubmit = async () => {
    if (!squad) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        side,
        formation: formation.trim() || undefined,
        players: squad.filter((player) => selectedIds.has(player.id)),
      });
      onClose();
    } catch {
      setError('Could not save the lineup. Try again.');
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
          <SectionHeader title="Edit lineup" variant="accent" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <TextField
          label="Formation (e.g. 2-3-1)"
          value={formation}
          onChangeText={setFormation}
          autoCapitalize="none"
        />
        {loadError ? (
          <StateView
            state="error"
            message="Could not load the squad."
            onRetry={() => {
              setLoadError(false);
              repository
                .getSquad()
                .then(setSquad)
                .catch(() => setLoadError(true));
            }}
          />
        ) : !squad ? (
          <StateView state="loading" />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {squad.map((player) => (
              <PlayerOption
                key={player.id}
                player={player}
                selected={selectedIds.has(player.id)}
                onPress={() => toggle(player.id)}
              />
            ))}
          </ScrollView>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : 'Save lineup'}
          onPress={handleSubmit}
          disabled={isSubmitting || !squad || selectedIds.size === 0}
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
  list: {
    gap: spacing.xs,
  },
  row: {
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
  rowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  number: {
    ...typography.body,
    color: colors.textSecondary,
    width: spacing.lg,
    textAlign: 'right',
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  position: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
