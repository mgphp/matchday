import { Pressable, StyleSheet, Text, View } from 'react-native';

import { positionsLabel } from '@/lib/positions';
import type { Player } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

/**
 * The substitutes, each tappable to mark them not at this match.
 * `availableIds` is `null` for "everyone available".
 */
export function AvailabilityList({
  substitutes,
  availableIds,
  onToggle,
}: {
  substitutes: Player[];
  availableIds: string[] | null;
  onToggle: (playerId: string) => void;
}) {
  return (
    <View>
      <Text style={styles.subsTitle}>Substitutes</Text>
      {substitutes.length === 0 ? (
        <Text style={styles.emptyText}>Everyone is in the starting lineup.</Text>
      ) : (
        <>
          <Text style={styles.subsHint}>
            Tap anyone who isn&#8217;t at this match — they won&#8217;t count towards each
            player&#8217;s share of game time.
          </Text>
          {substitutes.map((player) => {
            const missing = availableIds !== null && !availableIds.includes(player.id);
            return (
              <Pressable
                key={player.id}
                accessibilityRole="button"
                accessibilityState={{ selected: !missing }}
                accessibilityLabel={`${player.squadNumber} ${player.name}, ${positionsLabel(player)}, ${
                  missing ? 'not available' : 'available'
                }`}
                onPress={() => onToggle(player.id)}
                style={styles.subRowPressable}
              >
                <Text style={[styles.subRow, missing && styles.subRowUnavailable]}>
                  {player.squadNumber} {player.name} · {positionsLabel(player)}
                </Text>
                {missing ? <Text style={styles.subRowTag}>not available</Text> : null}
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
