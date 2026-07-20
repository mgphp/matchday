import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

type BadgeVariant = 'default' | 'alert' | 'live';

type BadgeProps = ViewProps & {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = 'default', style, ...props }: BadgeProps) {
  return (
    <View style={[styles.base, variants[variant], style]} {...props}>
      <Text style={[styles.label, labels[variant]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

const variants = StyleSheet.create({
  default: { backgroundColor: colors.accentMuted },
  alert: { backgroundColor: colors.alertMuted },
  live: { backgroundColor: colors.alert },
});

const labels = StyleSheet.create({
  default: { color: colors.accent },
  alert: { color: colors.alert },
  live: { color: colors.textOnAccent },
});
