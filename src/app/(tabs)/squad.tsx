import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { Player } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { colors, spacing, typography } from '@/theme/theme';

function PlayerRow({ player }: { player: Player }) {
  return (
    <View style={styles.row}>
      <Text style={styles.number}>{player.squadNumber}</Text>
      <Text style={styles.name}>{player.name}</Text>
      <Badge label={player.position} />
    </View>
  );
}

export default function SquadScreen() {
  const { status, data, reload } = useData(repository.getSquad);

  return (
    <Screen>
      {status === 'loading' ? (
        <StateView state="loading" />
      ) : status === 'error' ? (
        <StateView state="error" message="Could not load the squad." onRetry={reload} />
      ) : data.length === 0 ? (
        <StateView state="empty" message="No players in the squad." />
      ) : (
        <Card>
          <FlatList
            data={data}
            keyExtractor={(player) => player.id}
            renderItem={({ item }) => <PlayerRow player={item} />}
            scrollEnabled={false}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  number: {
    ...typography.body,
    color: colors.textSecondary,
    width: spacing.lg,
    textAlign: 'right',
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
