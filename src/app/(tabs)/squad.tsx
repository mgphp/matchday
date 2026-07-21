import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { Player, PlayerPosition } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { colors, spacing, typography } from '@/theme/theme';

const POSITION_ORDER: PlayerPosition[] = ['GK', 'DF', 'MF', 'FW'];

const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: 'Goalkeepers',
  DF: 'Defenders',
  MF: 'Midfielders',
  FW: 'Forwards',
};

function groupByPosition(players: Player[]) {
  return POSITION_ORDER.map((position) => ({
    position,
    title: POSITION_LABELS[position],
    data: players.filter((player) => player.position === position),
  })).filter((section) => section.data.length > 0);
}

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
          <SectionList
            sections={groupByPosition(data)}
            keyExtractor={(player) => player.id}
            renderItem={({ item }) => <PlayerRow player={item} />}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            scrollEnabled={false}
            stickySectionHeadersEnabled={false}
            initialNumToRender={100}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
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
