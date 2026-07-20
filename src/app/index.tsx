import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Matchday' }} />
      <Text style={styles.title}>Matchday</Text>
      <Text style={styles.subtitle}>Project setup complete. Kick-off soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.accent,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
