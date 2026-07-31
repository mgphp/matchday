import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text } from 'react-native';

import { AddPlayerModal } from '@/components/add-player-modal';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EditPlayerModal } from '@/components/edit-player-modal';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { UndoBanner } from '@/components/undo-banner';
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

function PlayerRow({ player, onPress }: { player: Player; onPress: () => void }) {
  const position = POSITION_LABELS[player.position].replace(/s$/, '');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Number ${player.squadNumber}, ${player.name}, ${position}`}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.number}>{player.squadNumber}</Text>
      <Text style={styles.name}>{player.name}</Text>
      <Badge label={player.position} />
    </Pressable>
  );
}

export default function SquadScreen() {
  const { status, data, reload } = useData(repository.getSquad);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [removedPlayer, setRemovedPlayer] = useState<Player | null>(null);
  // Stable identity so UndoBanner's dismiss timer isn't reset on every render.
  const dismissUndo = useCallback(() => setRemovedPlayer(null), []);

  return (
    <Screen>
      <Button label="Add player" onPress={() => setIsAddingPlayer(true)} />
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
            renderItem={({ item }) => (
              <PlayerRow player={item} onPress={() => setEditingPlayer(item)} />
            )}
            renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
            scrollEnabled={false}
            stickySectionHeadersEnabled={false}
            disableVirtualization
          />
        </Card>
      )}
      <AddPlayerModal
        visible={isAddingPlayer}
        onClose={() => setIsAddingPlayer(false)}
        onSubmit={async (player) => {
          await repository.addPlayer(player);
          await reload();
        }}
      />
      {editingPlayer ? (
        <EditPlayerModal
          visible
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSubmit={async (player) => {
            await repository.updatePlayer(player);
            await reload();
          }}
          onRemove={async () => {
            await repository.removePlayer(editingPlayer.id);
            setRemovedPlayer(editingPlayer);
            await reload();
          }}
        />
      ) : null}
      {removedPlayer ? (
        <UndoBanner
          message={`Removed ${removedPlayer.name}`}
          onUndo={async () => {
            const player = removedPlayer;
            setRemovedPlayer(null);
            await repository.restorePlayer(player);
            await reload();
          }}
          onDismiss={dismissUndo}
        />
      ) : null}
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
