import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

/** How long the banner stays up before giving up on being useful. */
export const UNDO_TIMEOUT_MS = 8_000;

/**
 * A transient "that happened — want it back?" bar.
 *
 * Deliberately not a blocking confirm dialog: the action has already gone
 * through, so the coach isn't held up, and ignoring the banner is a valid
 * answer.
 */
export function UndoBanner({
  message,
  actionLabel = 'Undo',
  onUndo,
  onDismiss,
  timeoutMs = UNDO_TIMEOUT_MS,
}: {
  message: string;
  actionLabel?: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** Set to 0 to keep the banner up until it is acted on. */
  timeoutMs?: number;
}) {
  useEffect(() => {
    if (timeoutMs <= 0) return;
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs, onDismiss]);

  return (
    <View accessibilityLiveRegion="polite" style={styles.banner}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onUndo}
        style={styles.action}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  message: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
});
