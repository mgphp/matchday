import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ChoiceChips } from '@/components/choice-chips';
import { SectionHeader } from '@/components/section-header';
import type { RotationPlan } from '@/lib/rotation-plan';
import type { Player } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

import { matchStyles as shared } from './match-styles';

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

const KEEPER_MODES = ['full', 'swap'] as const;
const KEEPER_MODE_LABELS = { full: 'Full match', swap: 'Swap at half time' };

/**
 * When to make each sub for even minutes, and whether the keeper plays the
 * full match or hands over at half time. Before kick-off it also lists
 * everyone's planned minutes.
 */
export function RotationPlanCard({
  plan,
  isPreMatch,
  duration,
  keeper,
  lineup,
  keeperOptions,
  secondKeeper,
  onChangeSecondKeeper,
}: {
  plan: RotationPlan;
  isPreMatch: boolean;
  duration: number;
  keeper?: Player;
  lineup?: Player[];
  /** Who could go in goal for the second half. */
  keeperOptions?: Player[];
  secondKeeper?: Player;
  /** Omitted once the keeper choice can no longer change (second half). */
  onChangeSecondKeeper?: (id: string | undefined) => void;
}) {
  const options = keeperOptions ?? [];
  // A swap needs a keeper on each half: the first-half keeper lifted from the
  // breaks (live, after a change) or the lineup keeper.
  const firstHalfKeeper = plan.keeperChange?.previous ?? keeper;
  return (
    <Card>
      <SectionHeader title="Rotation plan" variant="accent" />
      {onChangeSecondKeeper && keeper && options.length > 0 ? (
        <>
          <ChoiceChips
            label={`Goalkeeper (${keeper.name})`}
            options={KEEPER_MODES}
            optionLabels={KEEPER_MODE_LABELS}
            value={plan.swapsKeeper ? 'swap' : 'full'}
            onChange={(mode) =>
              onChangeSecondKeeper(mode === 'swap' ? (secondKeeper ?? options[0]).id : undefined)
            }
          />
          {plan.swapsKeeper ? (
            <ChoiceChips
              label="2nd-half keeper"
              options={options.map((player) => player.id)}
              optionLabels={Object.fromEntries(options.map((player) => [player.id, player.name]))}
              value={secondKeeper?.id ?? null}
              onChange={(id) => onChangeSecondKeeper(id)}
            />
          ) : null}
        </>
      ) : null}
      <Text style={styles.target}>
        {plan.swapsKeeper
          ? `Even share ≈ ${plan.target}′ each, goal time included · ${
              firstHalfKeeper?.name ?? 'keeper'
            } then ${secondKeeper?.name ?? 'keeper'} in goal`
          : `Even outfield share ≈ ${plan.target}′ each · goalkeeper plays the full match`}
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
      {plan.breaks.map(({ minute: at, subs, keeperChange }) => (
        <View
          key={at}
          style={styles.break}
          accessibilityLabel={`At ${at} minutes: ${[
            ...(keeperChange ? [`${keeperChange.keeper.name} goes in goal`] : []),
            ...subs.map((sub) => `${sub.on.name} on for ${sub.off.name}`),
          ].join(', ')}`}
        >
          <Text style={styles.minute}>{at}&#8242;</Text>
          <View style={styles.swaps}>
            {keeperChange ? (
              <Text style={styles.swap}>
                <Text style={styles.on}>
                  GK {keeperChange.keeper.squadNumber} {keeperChange.keeper.name}
                </Text>
                {'   '}
                <Text style={styles.off}>
                  out of goal {keeperChange.previous.squadNumber} {keeperChange.previous.name}
                </Text>
              </Text>
            ) : null}
            {subs.map((sub) => (
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
          {keeper && !plan.swapsKeeper ? (
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
          {plan.projected.map(({ player, minutes: planned, inGoal }) => {
            const starts = lineup?.some((starter) => starter.id === player.id) ?? false;
            const role =
              inGoal <= 0
                ? undefined
                : player.id === secondKeeper?.id
                  ? 'GK 2nd half'
                  : 'GK 1st half';
            return (
              <View
                key={player.id}
                accessibilityLabel={`${player.name}, ${
                  starts ? 'starts' : 'starts on the bench'
                }${role ? `, ${role}` : ''}, planned ${planned} minutes`}
                style={shared.row}
              >
                <Text style={shared.number}>{player.squadNumber}</Text>
                <Text style={[shared.name, !starts && shared.nameBench]}>{player.name}</Text>
                <Text style={shared.hint}>{role ?? (starts ? 'starts' : 'bench')}</Text>
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
