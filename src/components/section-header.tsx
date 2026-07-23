import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, spacing, typography } from '@/theme/theme';

type SectionHeaderVariant = 'default' | 'accent';

type SectionHeaderProps = Omit<TextProps, 'children'> & {
  title: string;
  variant?: SectionHeaderVariant;
};

/** Themed heading for grouping content within a screen (lists, card sections). */
export function SectionHeader({ title, variant = 'default', style, ...props }: SectionHeaderProps) {
  return (
    <Text style={[styles.base, variants[variant], style]} {...props}>
      {title}
    </Text>
  );
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
