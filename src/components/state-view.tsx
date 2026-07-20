import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/theme';

import { Button } from './button';

type StateViewProps =
  | { state: 'loading' }
  | { state: 'empty'; message: string }
  | { state: 'error'; message?: string; onRetry?: () => void };

/** Centered loading / empty / error placeholder for data-driven screens. */
export function StateView(props: StateViewProps) {
  return (
    <View style={styles.container}>
      {props.state === 'loading' ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : (
        <>
          <Text style={styles.message}>
            {props.state === 'error' ? (props.message ?? 'Something went wrong.') : props.message}
          </Text>
          {props.state === 'error' && props.onRetry ? (
            <Button label="Try again" variant="secondary" onPress={props.onRetry} />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
