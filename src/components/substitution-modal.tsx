import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { repository } from '@/lib/data';
import type { NewMatchEvent } from '@/lib/data/repository';
import { playersOnBench, playersOnPitch } from '@/lib/lineup-state';
import type { MatchDetail, Player } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

function PlayerRow({
  player,
  direction,
  selected,
  onPress,
}: {
  player: Player;
  /** Which list this row is in — the two are otherwise identical to a screen reader. */
  direction: 'off' | 'on';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${direction === 'off' ? 'Take off' : 'Bring on'} ${player.squadNumber} ${player.name}, ${player.position}`}
      onPress={onPress}
      style={[styles.playerRow, selected && styles.playerRowSelected]}
    >
      <Text style={[styles.playerNumber, selected && styles.playerTextSelected]}>
        {player.squadNumber}
      </Text>
      <Text style={[styles.playerName, selected && styles.playerTextSelected]}>{player.name}</Text>
      <Text style={styles.playerPosition}>{player.position}</Text>
    </Pressable>
  );
}

interface SubstitutionProps {
  onClose: () => void;
  match: MatchDetail;
  /** Which side of this fixture is ours. */
  side: 'home' | 'away';
  /** Current match minute, from the clock. */
  minute: number;
  onSubmit: (event: NewMatchEvent) => Promise<void>;
}

/**
 * Records a substitution: who comes off, who comes on, and at what minute.
 *
 * The minute defaults to the live clock but stays editable — a coach usually
 * gets to their phone a beat after waving the sub on. It is captured once, on
 * open, rather than tracking the clock: re-syncing every second would fight a
 * coach typing a correction into the field.
 */
export function SubstitutionModal({ visible, ...props }: SubstitutionProps & { visible: boolean }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      {/* Mounted only while open, so every opening starts from a clean form
          with the minute captured as it stands right now. */}
      {visible ? <SubstitutionForm {...props} /> : null}
    </Modal>
  );
}

function SubstitutionForm({ onClose, match, side, minute, onSubmit }: SubstitutionProps) {
  const [squad, setSquad] = useState<Player[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [offId, setOffId] = useState<string>();
  const [onId, setOnId] = useState<string>();
  const [minuteText, setMinuteText] = useState(() => minute.toString());
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    repository
      .getSquad()
      .then((result) => {
        if (cancelled) return;
        setSquad(result);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const starting = match.lineups?.[side] ?? [];
  const onPitch = playersOnPitch(starting, match.events, side, squad ?? []);
  const bench = playersOnBench(squad ?? [], onPitch);

  const parsedMinute = Number(minuteText);
  const isValidMinute =
    minuteText.length > 0 && Number.isInteger(parsedMinute) && parsedMinute >= 0;
  const isComplete = offId !== undefined && onId !== undefined && isValidMinute;

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  const handleSubmit = async () => {
    const off = onPitch.find((player) => player.id === offId);
    const on = bench.find((player) => player.id === onId);
    if (!off || !on) return;

    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        minute: parsedMinute,
        type: 'substitution',
        side,
        // `player` is the one coming on and `detail` the one going off —
        // matches how EventRow already renders substitutions.
        player: on.name,
        detail: `for ${off.name}`,
        playerId: on.id,
        relatedPlayerId: off.id,
      });
      onClose();
    } catch {
      setError('Could not record the substitution. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <SectionHeader title="Substitution" variant="accent" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        {loadError ? (
          <StateView
            state="error"
            message="Could not load the squad."
            onRetry={() => {
              setLoadError(false);
              repository
                .getSquad()
                .then(setSquad)
                .catch(() => setLoadError(true));
            }}
          />
        ) : !squad ? (
          <StateView state="loading" />
        ) : starting.length === 0 ? (
          <Text style={styles.emptyText}>
            Pick a starting lineup first — there is nobody on the pitch to substitute.
          </Text>
        ) : (
          <>
            <View style={styles.group}>
              <Text style={styles.groupLabel}>Coming off</Text>
              {onPitch.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  direction="off"
                  selected={player.id === offId}
                  onPress={() => setOffId(player.id === offId ? undefined : player.id)}
                />
              ))}
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Coming on</Text>
              {bench.length === 0 ? (
                <Text style={styles.emptyText}>Nobody on the bench.</Text>
              ) : (
                bench.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    direction="on"
                    selected={player.id === onId}
                    onPress={() => setOnId(player.id === onId ? undefined : player.id)}
                  />
                ))
              )}
            </View>

            <TextField
              label="Minute"
              value={minuteText}
              onChangeText={setMinuteText}
              keyboardType="number-pad"
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : 'Record substitution'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    ...typography.body,
    color: colors.accent,
  },
  group: {
    gap: spacing.xs,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  playerRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  playerNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    width: spacing.lg,
  },
  playerName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  playerTextSelected: {
    color: colors.accent,
  },
  playerPosition: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
