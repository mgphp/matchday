import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, spacing, typography } from '@/theme/theme';

type SectionHeaderVariant = 'default' | 'accent';

type SectionHeaderProps = {
  title: string;
  variant?: SectionHeaderVariant;
  style?: StyleProp<TextStyle>;
};

/** Themed heading for grouping content within a screen (lists, card sections). */
export function SectionHeader({ title, variant = 'default', style }: SectionHeaderProps) {
  return <Text style={[styles.base, variants[variant], style]}>{title}</Text>;
}

const styles = StyleSheet.create({
  base: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
});

const variants = StyleSheet.create({
  default: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    backgroundColor: colors.surface,
  },
  accent: {
    ...typography.heading,
    color: colors.accent,
  },
});
