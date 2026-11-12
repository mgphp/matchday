import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { colors, spacing, typography } from '@/theme/theme';

/**
 * The one confirm pattern for destructive actions: a labelled "Danger zone"
 * with a trigger button that expands into a warning plus Cancel / confirm.
 * Use it for every remove/delete in a modal. Where the action can be undone
 * (removing a player), the caller also shows an `UndoBanner` afterwards.
 *
 * If `onConfirm` rejects, the panel collapses back to the trigger and the
 * error goes to `onError` so the caller can say what went wrong.
 */
export function ConfirmDestructive({
  description,
  triggerLabel,
  warning,
  confirmLabel,
  busyLabel,
  onConfirm,
  onError,
  disabled,
}: {
  /** One line under the heading: what the action removes. */
  description: string;
  /** e.g. "Remove fixture" */
  triggerLabel: string;
  /** Shown once expanded, e.g. "Delete this fixture? This can't be undone." */
  warning: string;
  /** e.g. "Delete fixture" */
  confirmLabel: string;
  /** e.g. "Removing…" */
  busyLabel: string;
  onConfirm: () => Promise<void>;
  onError?: (error: unknown) => void;
  disabled?: boolean;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const handleConfirm = async () => {
    setIsBusy(true);
    try {
      await onConfirm();
    } catch (error) {
      setIsConfirming(false);
      onError?.(error);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.section} accessibilityLabel="Danger zone">
      <Text style={styles.heading}>Danger zone</Text>
      <Text style={styles.description}>{description}</Text>
      {isConfirming ? (
        <>
          <Text style={styles.warning}>{warning}</Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setIsConfirming(false)}
                disabled={isBusy}
              />
            </View>
            <View style={styles.action}>
              <Button
                label={isBusy ? busyLabel : confirmLabel}
                onPress={handleConfirm}
                disabled={isBusy}
              />
            </View>
          </View>
        </>
      ) : (
        <Button
          label={triggerLabel}
          variant="secondary"
          onPress={() => setIsConfirming(true)}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.danger,
  },
  heading: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
    textTransform: 'uppercase',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  warning: {
    ...typography.caption,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
});
