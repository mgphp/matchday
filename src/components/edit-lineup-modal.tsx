import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { LineupUpdate } from '@/lib/data/repository';
import { buildSlots, type Group, type Slot } from '@/lib/pitch-slots';
import type { MatchDetail, Player } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

const MIN_TEAM_SIZE = 5;
const MAX_TEAM_SIZE = 11;
const DEFAULT_TEAM_SIZE = 7;

/** Pitch colours — deliberately real grass/paint, not theme tokens. */
const PITCH_GREEN = '#1e5631';
const PITCH_STRIPE = '#1a4b2b';
const PITCH_LINE = 'rgba(255,255,255,0.5)';
const PITCH_LINE_WIDTH = 2;
/** Portrait half-pitch: full width, a little taller — room for four slot rows. */
const PITCH_ASPECT_RATIO = 0.82;

/** Every way to split `outfield` players into 3 positive groups (DF-MF-FW). */
function formationsFor(outfield: number): string[] {
  const options: string[] = [];
  for (let df = 1; df <= outfield - 2; df++) {
    for (let mf = 1; mf <= outfield - df - 1; mf++) {
      const fw = outfield - df - mf;
      if (fw >= 1) options.push(`${df}-${mf}-${fw}`);
    }
  }
  return options;
}

/** The most evenly-spread split — a reasonable default when nothing else applies. */
function mostBalanced(options: string[]): string {
  return options.reduce((best, option) => {
    const variance = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    };
    const parts = (formation: string) => formation.split('-').map(Number);
    return variance(parts(option)) < variance(parts(best)) ? option : best;
  }, options[0]);
}

/**
 * Greedily places players into slots matching their squad position. Slot
 * identity within a group is arbitrary (defenders are interchangeable), so
 * this is all the "memory" a lineup needs — no positional metadata to store.
 */
function placeByPosition(players: Player[], slots: Slot[]): Record<string, Player> {
  const assignments: Record<string, Player> = {};
  const remaining = [...players];
  for (const slot of slots) {
    const index = remaining.findIndex((player) => player.position === slot.group);
    if (index === -1) continue;
    assignments[slot.id] = remaining[index];
    remaining.splice(index, 1);
  }
  return assignments;
}

/**
 * Restores the exact slot a saved lineup used, rather than re-deriving one.
 * `slotMap` is keyed by the same ids `buildSlots` produces, so this only
 * finds anything when the formation hasn't changed since the save — the
 * caller falls back to `placeByPosition` otherwise (undefined `slotMap`, or a
 * player id it names no longer exists).
 */
function placeBySlots(
  players: Player[],
  slotMap: Record<string, string> | undefined,
  slots: Slot[],
): Record<string, Player> | null {
  if (!slotMap) return null;
  const byId = new Map(players.map((player) => [player.id, player]));
  const assignments: Record<string, Player> = {};
  for (const slot of slots) {
    const playerId = slotMap[slot.id];
    const player = playerId !== undefined ? byId.get(playerId) : undefined;
    if (player) assignments[slot.id] = player;
  }
  return Object.keys(assignments).length === players.length ? assignments : null;
}

const GROUP_ORDER: Group[] = ['FW', 'MF', 'DF', 'GK'];

/**
 * The line markings of a defensive half, drawn with plain Views: our goal is
 * at the bottom, the halfway line across the top. Arcs are half/quarter
 * circles made with one rounded, one-sided-open border rather than SVG or
 * clip-path (neither is available here). Purely decorative — it sits behind
 * the tappable slots and carries no interaction.
 */
function PitchMarkings() {
  return (
    <View style={styles.markings} pointerEvents="none" testID="pitch-markings">
      <View style={styles.stripes} testID="pitch-stripes">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.stripe, i % 2 === 1 && styles.stripeAlt]} />
        ))}
      </View>
      <View style={styles.halfwayLine} testID="pitch-halfway-line" />
      <View style={styles.centreCircle} testID="pitch-centre-circle" />
      <View style={styles.centreSpot} />
      <View style={styles.penaltyArea} testID="pitch-penalty-area" />
      <View style={styles.goalArea} testID="pitch-goal-area" />
      <View style={styles.penaltyArc} testID="pitch-penalty-arc" />
      <View style={styles.penaltySpot} />
      <View style={styles.goalFrame} testID="pitch-goal-frame" />
      <View style={[styles.cornerArc, styles.cornerArcLeft]} testID="pitch-corner-arc-left" />
      <View style={[styles.cornerArc, styles.cornerArcRight]} testID="pitch-corner-arc-right" />
    </View>
  );
}

function PitchSlot({
  group,
  player,
  onPress,
}: {
  group: Group;
  player?: Player;
  onPress: () => void;
}) {
  const label = player
    ? `Change ${player.name}'s position`
    : `Add a ${group === 'GK' ? 'goalkeeper' : group} to this position`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.slot, player && styles.slotFilled]}
    >
      <Text style={styles.slotText}>{player ? player.squadNumber : '+'}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControl}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decrementLabel}
          onPress={onDecrement}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>–</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={incrementLabel}
          onPress={onIncrement}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
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

  const initialTeamSize = useMemo(() => {
    if (!match.formation) return DEFAULT_TEAM_SIZE;
    const outfield = match.formation.split('-').reduce((sum, part) => sum + Number(part), 0);
    const size = outfield + 1;
    return Math.min(MAX_TEAM_SIZE, Math.max(MIN_TEAM_SIZE, size));
  }, [match.formation]);

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
    const clamped = Math.min(MAX_TEAM_SIZE, Math.max(MIN_TEAM_SIZE, next));
    if (clamped === teamSize) return;
    const options = formationsFor(clamped - 1);
    const nextFormation = mostBalanced(options);
    const nextSlots = buildSlots(nextFormation);
    setTeamSize(clamped);
    setFormationIndex(options.indexOf(nextFormation));
    setAssignments((current) => placeByPosition(Object.values(current), nextSlots));
  };

  const changeFormation = (delta: number) => {
    const nextIndex = (formationIndex + delta + formationOptions.length) % formationOptions.length;
    const nextSlots = buildSlots(formationOptions[nextIndex]);
    setFormationIndex(nextIndex);
    setAssignments((current) => placeByPosition(Object.values(current), nextSlots));
  };

  const assignedIds = new Set(Object.values(assignments).map((player) => player.id));
  const substitutes = (squad ?? []).filter((player) => !assignedIds.has(player.id));
  const eligibleForPicker = pickerSlot
    ? (squad ?? []).filter(
        (player) => player.position === pickerSlot.group && !assignedIds.has(player.id),
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

          <Stepper
            label="Team size"
            value={String(teamSize)}
            onDecrement={() => changeTeamSize(teamSize - 1)}
            onIncrement={() => changeTeamSize(teamSize + 1)}
            decrementLabel="Fewer players"
            incrementLabel="More players"
          />
          <Stepper
            label="Formation"
            value={formation}
            onDecrement={() => changeFormation(-1)}
            onIncrement={() => changeFormation(1)}
            decrementLabel="Previous formation"
            incrementLabel="Next formation"
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
              <View style={styles.pitch}>
                <PitchMarkings />
                <View style={styles.pitchRows}>
                  {GROUP_ORDER.map((group) => (
                    <View key={group} style={styles.pitchRow}>
                      {slots
                        .filter((slot) => slot.group === group)
                        .map((slot) => (
                          <View
                            key={slot.id}
                            style={[styles.slotLane, { left: `${slot.lane * 100}%` }]}
                          >
                            <PitchSlot
                              group={group}
                              player={assignments[slot.id]}
                              onPress={() => setPickerSlot(slot)}
                            />
                          </View>
                        ))}
                    </View>
                  ))}
                </View>
              </View>

              {pickerSlot ? (
                <View style={styles.picker}>
                  <Text style={styles.pickerTitle}>
                    {pickerSlot.group === 'GK' ? 'Goalkeeper' : pickerSlot.group}
                  </Text>
                  {assignments[pickerSlot.id] ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => clearSlot(pickerSlot)}
                      style={styles.pickerRow}
                    >
                      <Text style={styles.pickerClear}>Clear this position</Text>
                    </Pressable>
                  ) : null}
                  {eligibleForPicker.length === 0 ? (
                    <Text style={styles.emptyText}>No available players for this position.</Text>
                  ) : (
                    eligibleForPicker.map((player) => (
                      <Pressable
                        key={player.id}
                        accessibilityRole="button"
                        accessibilityLabel={player.name}
                        onPress={() => assign(pickerSlot, player)}
                        style={styles.pickerRow}
                      >
                        <Text style={styles.pickerNumber}>{player.squadNumber}</Text>
                        <Text style={styles.pickerName}>{player.name}</Text>
                      </Pressable>
                    ))
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPickerSlot(null)}
                    style={styles.pickerRow}
                  >
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={styles.subsTitle}>Substitutes</Text>
                  {substitutes.length === 0 ? (
                    <Text style={styles.emptyText}>Everyone is in the starting lineup.</Text>
                  ) : (
                    <>
                      <Text style={styles.subsHint}>
                        Tap anyone who isn&#8217;t at this match — they won&#8217;t count towards
                        each player&#8217;s share of game time.
                      </Text>
                      {substitutes.map((player) => {
                        const missing = availableIds !== null && !availableIds.includes(player.id);
                        return (
                          <Pressable
                            key={player.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: !missing }}
                            accessibilityLabel={`${player.squadNumber} ${player.name}, ${player.position}, ${
                              missing ? 'not available' : 'available'
                            }`}
                            onPress={() => toggleAvailability(player.id)}
                            style={styles.subRowPressable}
                          >
                            <Text style={[styles.subRow, missing && styles.subRowUnavailable]}>
                              {player.squadNumber} {player.name} · {player.position}
                            </Text>
                            {missing ? <Text style={styles.subRowTag}>not available</Text> : null}
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                </View>
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    ...typography.body,
    color: colors.text,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepperButtonText: {
    ...typography.heading,
    color: colors.accent,
  },
  stepperValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
  pitch: {
    borderRadius: radii.lg,
    backgroundColor: PITCH_GREEN,
    borderWidth: PITCH_LINE_WIDTH,
    borderColor: PITCH_LINE,
    aspectRatio: PITCH_ASPECT_RATIO,
    overflow: 'hidden',
  },
  markings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stripes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stripe: {
    flex: 1,
    backgroundColor: PITCH_GREEN,
  },
  stripeAlt: {
    backgroundColor: PITCH_STRIPE,
  },
  halfwayLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: PITCH_LINE_WIDTH,
    backgroundColor: PITCH_LINE,
  },
  centreCircle: {
    position: 'absolute',
    top: 0,
    left: '30%',
    width: '40%',
    aspectRatio: 2,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.full,
    borderBottomRightRadius: radii.full,
  },
  centreSpot: {
    position: 'absolute',
    top: -3,
    left: '50%',
    width: 6,
    height: 6,
    marginLeft: -3,
    borderRadius: radii.full,
    backgroundColor: PITCH_LINE,
  },
  penaltyArea: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    width: '60%',
    height: '34%',
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderBottomWidth: 0,
  },
  goalArea: {
    position: 'absolute',
    bottom: 0,
    left: '36%',
    width: '28%',
    height: '14%',
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderBottomWidth: 0,
  },
  penaltyArc: {
    position: 'absolute',
    bottom: '34%',
    left: '38%',
    width: '24%',
    aspectRatio: 2,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderBottomWidth: 0,
    borderTopLeftRadius: radii.full,
    borderTopRightRadius: radii.full,
  },
  penaltySpot: {
    position: 'absolute',
    bottom: '24%',
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: radii.full,
    backgroundColor: PITCH_LINE,
  },
  goalFrame: {
    position: 'absolute',
    bottom: 0,
    left: '42%',
    width: '16%',
    height: 6,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cornerArc: {
    position: 'absolute',
    bottom: 0,
    width: '7%',
    aspectRatio: 1,
    borderColor: PITCH_LINE,
  },
  cornerArcLeft: {
    left: 0,
    borderTopWidth: PITCH_LINE_WIDTH,
    borderRightWidth: PITCH_LINE_WIDTH,
    borderTopRightRadius: radii.full,
  },
  cornerArcRight: {
    right: 0,
    borderTopWidth: PITCH_LINE_WIDTH,
    borderLeftWidth: PITCH_LINE_WIDTH,
    borderTopLeftRadius: radii.full,
  },
  pitchRows: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
    paddingVertical: spacing.md,
  },
  pitchRow: {
    height: 44,
  },
  slotLane: {
    position: 'absolute',
    top: 0,
    transform: [{ translateX: -22 }],
  },
  slot: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PITCH_LINE,
  },
  slotFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slotText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
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
  subsTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  subRow: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.xs / 2,
    flex: 1,
  },
  subsHint: {
    ...typography.caption,
    color: colors.textDisabled,
    paddingBottom: spacing.xs,
  },
  subRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  subRowUnavailable: {
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  subRowTag: {
    ...typography.caption,
    color: colors.alert,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
