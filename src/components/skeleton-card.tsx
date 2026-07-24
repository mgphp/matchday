import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/theme';

/** Pulsing placeholder mimicking a MatchCard, shown while fixtures are loading. */
export function SkeletonCard() {
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View accessibilityLabel="Loading fixture" style={styles.card}>
      <Animated.View style={[styles.block, styles.badge, { opacity }]} />
      <Animated.View style={[styles.block, styles.title, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  block: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
  },
  badge: {
    width: 72,
    height: 20,
  },
  title: {
    width: '70%',
    height: 22,
  },
});
