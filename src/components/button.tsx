import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
};

export function Button({ label, variant = 'primary', disabled, style, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        variants[variant],
        state.pressed && pressed[variant],
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textOnAccent,
  },
  labelSecondary: {
    color: colors.accent,
  },
});

const variants = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

const pressed = StyleSheet.create({
  primary: { backgroundColor: colors.accentPressed },
  secondary: { opacity: 0.8 },
});
