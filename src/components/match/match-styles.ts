import { StyleSheet } from 'react-native';

import { colors, spacing, typography } from '@/theme/theme';

/** Row and text styles shared by the match-centre cards (minutes, rotation plan). */
export const matchStyles = StyleSheet.create({
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  number: {
    ...typography.caption,
    color: colors.textSecondary,
    width: spacing.lg,
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  nameBench: {
    color: colors.textSecondary,
  },
  nameUnavailable: {
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  value: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
});
