import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { availablePlayers } from '@/lib/availability';
import { repository } from '@/lib/data';
import type { NewMatchEvent } from '@/lib/data/repository';
import { playersOnBench, playersOnPitch } from '@/lib/lineup-state';
import type { MatchDetail, Player } from '@/lib/types';
import { colors, radii, spacing, typography } from '@/theme/theme';

const EVENT_TYPES = ['goal', 'yellow-card', 'red-card'] as const;
type RecordableType = (typeof EVENT_TYPES)[number];

const TYPE_LABELS: Record<RecordableType, string> = {
  goal: 'Goal',
  'yellow-card': 'Yellow card',
  'red-card': 'Red card',
};

const SIDES = ['home', 'away'] as const;
type Side = (typeof SIDES)[number];

function PlayerRow({
  player,
  selected,
  onPress,
}: {
  player: Player;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${player.squadNumber} ${player.name}`}
      onPress={onPress}
      style={[styles.playerRow, selected && styles.playerRowSelected]}
    >
      <Text style={[styles.playerNumber, selected && styles.playerTextSelected]}>
        {player.squadNumber}
      </Text>
      <Text style={[styles.playerName, selected && styles.playerTextSelected]}>{player.name}</Text>
    </Pressable>
  );
}

interface RecordEventProps {
  onClose: () => void;
  match: MatchDetail;
  /** Which side of this fixture is ours. */
  side: Side;
  /** Current match minute, from the clock. */
  minute: number;
  onSubmit: (event: NewMatchEvent) => Promise<void>;
}

/**
 * Records a goal or card for either side. For our side the coach picks the
 * player from the squad (on the pitch first); the opponent's player is
 * optional free text, since we hold no opponent squad.
 *
 * Like the substitution modal, the minute is captured once on open and stays
 * editable — the coach usually records it a beat after it happened.
 */
export function RecordEventModal({ visible, ...props }: RecordEventProps & { visible: boolean }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      {/* Mounted only while open, so every opening starts from a clean form. */}
      {visible ? <RecordEventForm {...props} /> : null}
    </Modal>
  );
}

function RecordEventForm({ onClose, match, side, minute, onSubmit }: RecordEventProps) {
  const [squad, setSquad] = useState<Player[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [type, setType] = useState<RecordableType>('goal');
  const [eventSide, setEventSide] = useState<Side>(side);
  const [playerId, setPlayerId] = useState<string>();
  const [opponentPlayer, setOpponentPlayer] = useState('');
  const [minuteText, setMinuteText] = useState(() => minute.toString());
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSquad = () =>
    repository
      .getSquad()
      .then((result) => {
        setSquad(result);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));

  useEffect(() => {
    let cancelled = false;
    repository
      .getSquad()
      .then((result) => {
        if (!cancelled) setSquad(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isOurs = eventSide === side;
  const opponent = side === 'home' ? match.away : match.home;
  const available = availablePlayers(match, squad ?? []);
  const starting = match.lineups?.[side] ?? [];
  const onPitch = playersOnPitch(starting, match.events, side, available);
  // No lineup yet → nobody is "on the pitch", so offer the whole squad.
  const others = onPitch.length > 0 ? playersOnBench(available, onPitch) : available;
  const selected = available.find((player) => player.id === playerId);

  const parsedMinute = Number(minuteText);
  const isValidMinute =
    minuteText.length > 0 && Number.isInteger(parsedMinute) && parsedMinute >= 0;
  const isComplete = isValidMinute && (!isOurs || selected !== undefined);

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        minute: parsedMinute,
        type,
        side: eventSide,
        ...(isOurs && selected
          ? { player: selected.name, playerId: selected.id }
          : { player: opponentPlayer.trim() || opponent.name }),
      });
      onClose();
    } catch {
      setError(`Could not record the ${TYPE_LABELS[type].toLowerCase()}. Try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <SectionHeader title="Goal or card" variant="accent" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <ChoiceChips
          label="Event"
          options={EVENT_TYPES}
          optionLabels={TYPE_LABELS}
          value={type}
          onChange={setType}
        />
        <ChoiceChips
          label="Team"
          options={SIDES}
          optionLabels={{ home: match.home.shortName, away: match.away.shortName }}
          value={eventSide}
          onChange={setEventSide}
        />

        {!isOurs ? (
          <TextField
            label="Player (optional)"
            value={opponentPlayer}
            onChangeText={setOpponentPlayer}
          />
        ) : loadError ? (
          <StateView state="error" message="Could not load the squad." onRetry={loadSquad} />
        ) : !squad ? (
          <StateView state="loading" />
        ) : (
          <>
            {onPitch.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>On the pitch</Text>
                {onPitch.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    selected={player.id === playerId}
                    onPress={() => setPlayerId(player.id === playerId ? undefined : player.id)}
                  />
                ))}
              </View>
            ) : null}
            {others.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>{onPitch.length > 0 ? 'Bench' : 'Squad'}</Text>
                {others.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    selected={player.id === playerId}
                    onPress={() => setPlayerId(player.id === playerId ? undefined : player.id)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}

        <TextField
          label="Minute"
          value={minuteText}
          onChangeText={setMinuteText}
          keyboardType="number-pad"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : `Record ${TYPE_LABELS[type].toLowerCase()}`}
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
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
