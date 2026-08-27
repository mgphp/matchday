import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
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
const TEAM_SIZES: readonly string[] = Array.from(
  { length: MAX_TEAM_SIZE - MIN_TEAM_SIZE + 1 },
  (_, i) => String(MIN_TEAM_SIZE + i),
);

/** Pitch colours — deliberately real grass/paint, not theme tokens. */
const PITCH_GREEN = '#2f8f45';
/** Faint white paint, like a broadcast graphic. */
const PITCH_LINE = 'rgba(255,255,255,0.22)';
const PITCH_LINE_WIDTH = 1;
/** Full pitch, portrait — both boxes visible, room for four slot rows. */
const PITCH_ASPECT_RATIO = 0.64;

/** Mixes two `#rrggbb` colours; `t` runs 0 (from) → 1 (to). */
function mixHex(from: string, to: string, t: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = channels(from);
  const [r2, g2, b2] = channels(to);
  const lerp = (a: number, b: number) =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${lerp(r1, r2)}${lerp(g1, g2)}${lerp(b1, b2)}`;
}

/**
 * A top-to-bottom green ramp, brighter at the top — stacked bands stand in for
 * a real gradient fill (no gradient primitive in React Native, no dep added).
 */
const PITCH_GRADIENT = Array.from({ length: 16 }, (_, i) => mixHex('#3fa457', '#1c5f30', i / 15));

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
 * A full pitch drawn with plain Views over a stacked-band green gradient: our
 * goal at the bottom, the opponent's at the top, halfway line and centre
 * circle across the middle. Arcs are half/quarter circles made with a
 * rounded, one-side-open border — React Native has no SVG or clip-path.
 * Purely decorative: it sits behind the tappable slots and takes no input.
 */
function PitchMarkings() {
  return (
    <View style={styles.markings} pointerEvents="none" testID="pitch-markings">
      <View style={styles.gradient} testID="pitch-gradient">
        {PITCH_GRADIENT.map((colour, i) => (
          <View key={i} style={[styles.gradientBand, { backgroundColor: colour }]} />
        ))}
      </View>

      <View style={styles.halfwayLine} testID="pitch-halfway-line" />
      <View style={styles.centreCircle} testID="pitch-centre-circle" />
      <View style={styles.centreSpot} />

      {/* Opponent's end (top) */}
      <View style={[styles.penaltyArea, styles.penaltyAreaTop]} testID="pitch-penalty-area-top" />
      <View style={[styles.goalArea, styles.goalAreaTop]} testID="pitch-goal-area-top" />
      <View style={[styles.penaltyArc, styles.penaltyArcTop]} testID="pitch-penalty-arc-top" />
      <View style={[styles.penaltySpot, styles.penaltySpotTop]} />
      <View style={[styles.goalFrame, styles.goalFrameTop]} testID="pitch-goal-frame-top" />

      {/* Our end (bottom) */}
      <View
        style={[styles.penaltyArea, styles.penaltyAreaBottom]}
        testID="pitch-penalty-area-bottom"
      />
      <View style={[styles.goalArea, styles.goalAreaBottom]} testID="pitch-goal-area-bottom" />
      <View
        style={[styles.penaltyArc, styles.penaltyArcBottom]}
        testID="pitch-penalty-arc-bottom"
      />
      <View style={[styles.penaltySpot, styles.penaltySpotBottom]} />
      <View style={[styles.goalFrame, styles.goalFrameBottom]} testID="pitch-goal-frame-bottom" />

      <View style={[styles.cornerArc, styles.cornerArcTL]} testID="pitch-corner-arc-tl" />
      <View style={[styles.cornerArc, styles.cornerArcTR]} testID="pitch-corner-arc-tr" />
      <View style={[styles.cornerArc, styles.cornerArcBL]} testID="pitch-corner-arc-bl" />
      <View style={[styles.cornerArc, styles.cornerArcBR]} testID="pitch-corner-arc-br" />
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

          <ChoiceChips
            label="Team size"
            options={TEAM_SIZES}
            value={String(teamSize)}
            onChange={(next) => changeTeamSize(Number(next))}
          />
          <ChoiceChips
            label="Formation"
            options={formationOptions}
            value={formation}
            onChange={changeFormationTo}
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
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientBand: {
    flex: 1,
  },
  halfwayLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: PITCH_LINE_WIDTH,
    backgroundColor: PITCH_LINE,
  },
  centreCircle: {
    position: 'absolute',
    top: '40%',
    left: '35%',
    width: '30%',
    aspectRatio: 1,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderRadius: radii.full,
  },
  centreSpot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    marginTop: -2.5,
    borderRadius: radii.full,
    backgroundColor: PITCH_LINE,
  },
  penaltyArea: {
    position: 'absolute',
    left: '21%',
    width: '58%',
    height: '16%',
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
  },
  penaltyAreaTop: {
    top: 0,
    borderTopWidth: 0,
  },
  penaltyAreaBottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  goalArea: {
    position: 'absolute',
    left: '36%',
    width: '28%',
    height: '7%',
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
  },
  goalAreaTop: {
    top: 0,
    borderTopWidth: 0,
  },
  goalAreaBottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  penaltyArc: {
    position: 'absolute',
    left: '39%',
    width: '22%',
    aspectRatio: 2,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
  },
  penaltyArcTop: {
    top: '16%',
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.full,
    borderBottomRightRadius: radii.full,
  },
  penaltyArcBottom: {
    bottom: '16%',
    borderBottomWidth: 0,
    borderTopLeftRadius: radii.full,
    borderTopRightRadius: radii.full,
  },
  penaltySpot: {
    position: 'absolute',
    left: '50%',
    width: 4,
    height: 4,
    marginLeft: -2,
    borderRadius: radii.full,
    backgroundColor: PITCH_LINE,
  },
  penaltySpotTop: {
    top: '11%',
  },
  penaltySpotBottom: {
    bottom: '11%',
  },
  goalFrame: {
    position: 'absolute',
    left: '43%',
    width: '14%',
    height: 5,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  goalFrameTop: {
    top: 0,
    borderTopWidth: 0,
  },
  goalFrameBottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  cornerArc: {
    position: 'absolute',
    width: '6%',
    aspectRatio: 1,
    borderColor: PITCH_LINE,
  },
  cornerArcTL: {
    top: 0,
    left: 0,
    borderBottomWidth: PITCH_LINE_WIDTH,
    borderRightWidth: PITCH_LINE_WIDTH,
    borderBottomRightRadius: radii.full,
  },
  cornerArcTR: {
    top: 0,
    right: 0,
    borderBottomWidth: PITCH_LINE_WIDTH,
    borderLeftWidth: PITCH_LINE_WIDTH,
    borderBottomLeftRadius: radii.full,
  },
  cornerArcBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: PITCH_LINE_WIDTH,
    borderRightWidth: PITCH_LINE_WIDTH,
    borderTopRightRadius: radii.full,
  },
  cornerArcBR: {
    bottom: 0,
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
