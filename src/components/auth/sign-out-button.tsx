import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/lib/auth/auth-context';
import { colors, spacing, typography } from '@/theme/theme';

/** Header-right control for signing out, shown on every tab. */
export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      onPress={signOut}
      hitSlop={spacing.sm}
    >
      <Text style={styles.label}>Sign out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    marginRight: spacing.md,
  },
});
