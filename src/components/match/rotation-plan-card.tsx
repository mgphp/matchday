import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { SectionHeader } from '@/components/section-header';
import type { PlannedSub, RotationPlan } from '@/lib/rotation-plan';
import type { Player } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

import { matchStyles as shared } from './match-styles';

/** Planned subs bucketed by the minute they happen at, minute ascending. */
function subsByMinute(subs: PlannedSub[]): { minute: number; swaps: PlannedSub[] }[] {
  const groups = new Map<number, PlannedSub[]>();
  for (const sub of subs) {
    groups.set(sub.minute, [...(groups.get(sub.minute) ?? []), sub]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minute, swaps]) => ({ minute, swaps }));
}

/** Before kick-off with no lineup: nudge the coach to set one. */
export function RotationPlanPrompt() {
  return (
    <Card>
      <SectionHeader title="Rotation plan" variant="accent" />
      <Text style={shared.emptyText}>
        Set your lineup to see when to make each sub and how long everyone plays.
      </Text>
    </Card>
  );
}

/**
 * When to make each sub for even outfield minutes. Before kick-off it also
 * lists everyone's planned minutes (keeper plays the whole match).
 */
export function RotationPlanCard({
  plan,
  isPreMatch,
  duration,
  keeper,
  lineup,
}: {
  plan: RotationPlan;
  isPreMatch: boolean;
  duration: number;
  keeper?: Player;
  lineup?: Player[];
}) {
  return (
    <Card>
      <SectionHeader title="Rotation plan" variant="accent" />
      <Text style={styles.target}>
        Even share ≈ {plan.target}&#8242; each · goalkeeper isn&#8217;t rotated
      </Text>
      {isPreMatch ? (
        <Text style={shared.hint}>
          Planned for a {duration}&#8242; match — change it for this match in Edit match, or for
          every match in Settings.
        </Text>
      ) : null}
      {isPreMatch && plan.subs.length === 0 ? (
        <Text style={shared.emptyText}>No one on the bench — everyone plays the full match.</Text>
      ) : null}
      {subsByMinute(plan.subs).map(({ minute: at, swaps }) => (
        <View
          key={at}
          style={styles.break}
          accessibilityLabel={`At ${at} minutes: ${swaps
            .map((sub) => `${sub.on.name} on for ${sub.off.name}`)
            .join(', ')}`}
        >
          <Text style={styles.minute}>{at}&#8242;</Text>
          <View style={styles.swaps}>
            {swaps.map((sub) => (
              <Text key={`${sub.on.id}-${sub.off.id}`} style={styles.swap}>
                <Text style={styles.on}>
                  &#8593; {sub.on.squadNumber} {sub.on.name}
                </Text>
                {'   '}
                <Text style={styles.off}>
                  &#8595; {sub.off.squadNumber} {sub.off.name}
                </Text>
              </Text>
            ))}
          </View>
        </View>
      ))}
      {isPreMatch ? (
        <>
          <Text style={shared.groupLabel}>Planned minutes</Text>
          {keeper ? (
            <View
              accessibilityLabel={`${keeper.name}, goalkeeper, planned ${duration} minutes`}
              style={shared.row}
            >
              <Text style={shared.number}>{keeper.squadNumber}</Text>
              <Text style={shared.name}>{keeper.name}</Text>
              <Text style={shared.hint}>goalkeeper</Text>
              <Text style={shared.value}>{duration}&#8242;</Text>
            </View>
          ) : null}
          {plan.projected.map(({ player, minutes: planned }) => {
            const starts = lineup?.some((starter) => starter.id === player.id) ?? false;
            return (
              <View
                key={player.id}
                accessibilityLabel={`${player.name}, ${
                  starts ? 'starts' : 'starts on the bench'
                }, planned ${planned} minutes`}
                style={shared.row}
              >
                <Text style={shared.number}>{player.squadNumber}</Text>
                <Text style={[shared.name, !starts && shared.nameBench]}>{player.name}</Text>
                <Text style={shared.hint}>{starts ? 'starts' : 'bench'}</Text>
                <Text style={shared.value}>{planned}&#8242;</Text>
              </View>
            );
          })}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  target: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  break: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  minute: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
    width: spacing.xl,
  },
  swaps: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  swap: {
    ...typography.body,
    color: colors.text,
  },
  on: {
    color: colors.accent,
  },
  off: {
    color: colors.textSecondary,
  },
});
