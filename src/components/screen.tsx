import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, spacing } from '@/theme/theme';

/** Base wrapper for tab screens: pitch-green background and standard padding. */
export function Screen({ style, ...props }: ViewProps) {
  return <View style={[styles.screen, style]} {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
});
