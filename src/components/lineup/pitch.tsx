import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GROUP_ORDER } from '@/lib/formations';
import type { Group, Slot } from '@/lib/pitch-slots';
import type { Player } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

import {
  PITCH_ASPECT_RATIO,
  PITCH_GREEN,
  PITCH_LINE,
  PITCH_LINE_WIDTH,
  PitchMarkings,
} from './pitch-markings';

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

/** The pitch with a tappable slot per position, attack at the top. */
export function Pitch({
  slots,
  assignments,
  onSlotPress,
}: {
  slots: Slot[];
  assignments: Record<string, Player>;
  onSlotPress: (slot: Slot) => void;
}) {
  return (
    <View style={styles.pitch}>
      <PitchMarkings />
      <View style={styles.pitchRows}>
        {GROUP_ORDER.map((group) => (
          <View key={group} style={styles.pitchRow}>
            {slots
              .filter((slot) => slot.group === group)
              .map((slot) => (
                <View key={slot.id} style={[styles.slotLane, { left: `${slot.lane * 100}%` }]}>
                  <PitchSlot
                    group={group}
                    player={assignments[slot.id]}
                    onPress={() => onSlotPress(slot)}
                  />
                </View>
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    borderRadius: radii.lg,
    backgroundColor: PITCH_GREEN,
    borderWidth: PITCH_LINE_WIDTH,
    borderColor: PITCH_LINE,
    aspectRatio: PITCH_ASPECT_RATIO,
    overflow: 'hidden',
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
});
