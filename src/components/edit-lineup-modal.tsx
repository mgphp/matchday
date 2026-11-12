import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { AvailabilityList } from '@/components/lineup/availability-list';
import { LineupShapeSelects } from '@/components/lineup/lineup-shape-selects';
import { Pitch } from '@/components/lineup/pitch';
import { SlotPicker } from '@/components/lineup/slot-picker';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { LineupUpdate } from '@/lib/data/repository';
import {
  clampTeamSize,
  formationsFor,
  mostBalanced,
  placeByPosition,
  placeBySlots,
  teamSizeOf,
} from '@/lib/formations';
import { DEFAULT_MATCH_FORMAT } from '@/lib/match-format';
import { buildSlots, type Slot } from '@/lib/pitch-slots';
import { canPlay } from '@/lib/positions';
import type { MatchDetail, Player } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

export function EditLineupModal({
  visible,
  onClose,
  match,
  side,
  defaultTeamSize = DEFAULT_MATCH_FORMAT.teamSize,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  match: MatchDetail;
  /** The team's format size, used when the match has no formation yet. */
  defaultTeamSize?: number;
  /** Which side of this fixture is ours. */
  side: 'home' | 'away';
  onSubmit: (update: LineupUpdate) => Promise<void>;
}) {
  const [squad, setSquad] = useState<Player[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const initialTeamSize = useMemo(
    () => (match.formation ? teamSizeOf(match.formation) : defaultTeamSize),
    [match.formation, defaultTeamSize],
  );

  const [teamSize, setTeamSize] = useState(initialTeamSize);
  const formationOptions = useMemo(() => formationsFor(teamSize - 1), [teamSize]);
  const [formationIndex, setFormationIndex] = useState(() => {
    const options = formationsFor(initialTeamSize - 1);
    const existing = match.formation ? options.indexOf(match.formation) : -1;
    return existing === -1 ? options.indexOf(mostBalanced(options)) : existing;
  });
  const formation = formationOptions[formationIndex] ?? mostBalanced(formationOptions);
  const slots = useMemo(() => buildSlots(formation), [formation]);

  const [assignments, setAssignments] = useState<Record<string, Player>>(() => {
    const players = match.lineups?.[side] ?? [];
    const slotMap = match.lineups?.[side === 'home' ? 'homeSlots' : 'awaySlots'];
    return placeBySlots(players, slotMap, slots) ?? placeByPosition(players, slots);
  });
  /**
   * Squad ids available for this match, or `null` for "everyone" — which is
   * both the default and what a normal week looks like, so a coach never has
   * to tick anyone in. Stored as the available set rather than the missing
   * one so it needs no knowledge of the squad until a row is actually tapped.
   */
  const [availableIds, setAvailableIds] = useState<string[] | null>(
    match.availablePlayerIds ?? null,
  );
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
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

  const changeTeamSize = (next: number) => {
    const clamped = clampTeamSize(next);
    if (clamped === teamSize) return;
    const options = formationsFor(clamped - 1);
    const nextFormation = mostBalanced(options);
    const nextSlots = buildSlots(nextFormation);
    setTeamSize(clamped);
    setFormationIndex(options.indexOf(nextFormation));
    setAssignments((current) => placeByPosition(Object.values(current), nextSlots));
  };

  const changeFormationTo = (next: string) => {
    const nextIndex = formationOptions.indexOf(next);
    if (nextIndex === -1 || nextIndex === formationIndex) return;
    const nextSlots = buildSlots(formationOptions[nextIndex]);
    setFormationIndex(nextIndex);
    setAssignments((current) => placeByPosition(Object.values(current), nextSlots));
  };

  const assignedIds = new Set(Object.values(assignments).map((player) => player.id));
  const substitutes = (squad ?? []).filter((player) => !assignedIds.has(player.id));
  const eligibleForPicker = pickerSlot
    ? (squad ?? []).filter(
        (player) => canPlay(player, pickerSlot.group) && !assignedIds.has(player.id),
      )
    : [];

  const assign = (slot: Slot, player: Player) => {
    setAssignments((current) => ({ ...current, [slot.id]: player }));
    setPickerSlot(null);
  };

  const clearSlot = (slot: Slot) => {
    setAssignments((current) => {
      const next = { ...current };
      delete next[slot.id];
      return next;
    });
    setPickerSlot(null);
  };

  /**
   * Marking the first player missing has to materialise the available list
   * from the squad; unticking the last one drops back to `null` so the match
   * carries no availability field at all.
   */
  const toggleAvailability = (playerId: string) => {
    setAvailableIds((current) => {
      const all = (squad ?? []).map((player) => player.id);
      if (current === null) return all.filter((id) => id !== playerId);
      if (current.includes(playerId)) {
        const next = current.filter((id) => id !== playerId);
        return next;
      }
      const next = all.filter((id) => current.includes(id) || id === playerId);
      return next.length === all.length ? null : next;
    });
  };

  const handleClose = () => {
    setError(undefined);
    setPickerSlot(null);
    onClose();
  };

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        side,
        formation,
        players: Object.values(assignments),
        slots: Object.fromEntries(
          Object.entries(assignments).map(([slotId, player]) => [slotId, player.id]),
        ),
        availablePlayerIds: availableIds ?? undefined,
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
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <SectionHeader title="Edit lineup" variant="accent" />
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <LineupShapeSelects
            teamSize={teamSize}
            formation={formation}
            formationOptions={formationOptions}
            onTeamSizeChange={changeTeamSize}
            onFormationChange={changeFormationTo}
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
            <>
              <Pitch slots={slots} assignments={assignments} onSlotPress={setPickerSlot} />
              {pickerSlot ? (
                <SlotPicker
                  slot={pickerSlot}
                  current={assignments[pickerSlot.id]}
                  eligible={eligibleForPicker}
                  onAssign={(player) => assign(pickerSlot, player)}
                  onClear={() => clearSlot(pickerSlot)}
                  onCancel={() => setPickerSlot(null)}
                />
              ) : (
                <AvailabilityList
                  substitutes={substitutes}
                  availableIds={availableIds}
                  onToggle={toggleAvailability}
                />
              )}
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={isSubmitting ? 'Saving…' : 'Save lineup'}
            onPress={handleSubmit}
            disabled={isSubmitting || !squad || Object.keys(assignments).length === 0}
          />
        </ScrollView>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
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
