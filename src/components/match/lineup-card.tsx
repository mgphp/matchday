import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { SectionHeader } from '@/components/section-header';
import type { Player } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

import { matchStyles as shared } from './match-styles';

/** Our starting lineup only — the app never records the opponent's. */
export function LineupCard({
  title,
  players,
  formation,
}: {
  title: string;
  players?: Player[];
  formation?: string;
}) {
  return (
    <Card>
      <SectionHeader title="Lineup" variant="accent" />
      {players && players.length > 0 ? (
        <View style={styles.column}>
          <Text style={styles.title}>
            {title}
            {formation ? ` (${formation})` : ''}
          </Text>
          {players.map((player) => (
            <Text key={player.id} style={styles.player}>
              {player.squadNumber} {player.name}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={shared.emptyText}>No lineup set yet — use Edit lineup to pick your team.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: spacing.xs,
  },
  title: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  player: {
    ...typography.body,
    color: colors.text,
  },
});
