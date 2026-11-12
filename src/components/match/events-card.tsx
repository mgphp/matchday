import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { SectionHeader } from '@/components/section-header';
import type { MatchEvent } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

import { matchStyles as shared } from './match-styles';

function eventIcon(type: MatchEvent['type']) {
  switch (type) {
    case 'goal':
      return <Ionicons name="football" size={16} color={colors.accent} />;
    case 'yellow-card':
      return <View style={[styles.cardIcon, { backgroundColor: colors.alert }]} />;
    case 'red-card':
      return <View style={[styles.cardIcon, { backgroundColor: colors.danger }]} />;
    case 'substitution':
      return <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />;
  }
}

const EVENT_NAMES: Record<MatchEvent['type'], string> = {
  goal: 'goal',
  'yellow-card': 'yellow card',
  'red-card': 'red card',
  substitution: 'substitution',
};

/**
 * One timeline row. The bin icon expands to an inline Cancel / Remove confirm
 * (compact-row exception to `ConfirmDestructive`) — a mis-tapped goal is
 * common on a touchline, and deleting one also takes it off the score.
 */
function EventRow({ event, onRemove }: { event: MatchEvent; onRemove: () => Promise<void> }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState(false);
  const description = `${event.minute} minute ${EVENT_NAMES[event.type]}, ${event.player}`;

  const handleRemove = async () => {
    setError(false);
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      setError(true);
      setIsRemoving(false);
      setIsConfirming(false);
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.minute}>{event.minute}&#8242;</Text>
        {eventIcon(event.type)}
        <Text style={styles.player}>{event.player}</Text>
        {event.detail ? <Text style={styles.detail}>{event.detail}</Text> : null}
        <View style={styles.spacer} />
        {isConfirming ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setIsConfirming(false)}
              disabled={isRemoving}
              style={styles.action}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Confirm remove ${description}`}
              onPress={handleRemove}
              disabled={isRemoving}
              style={styles.action}
            >
              <Text style={styles.remove}>{isRemoving ? 'Removing…' : 'Remove'}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${description}`}
            onPress={() => setIsConfirming(true)}
            hitSlop={spacing.sm}
            style={styles.action}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>Could not remove this event. Try again.</Text> : null}
    </View>
  );
}

/** The match timeline: goals, cards and subs, each removable. */
export function EventsCard({
  events,
  onRemove,
}: {
  events: MatchEvent[];
  onRemove: (eventId: string) => Promise<void>;
}) {
  return (
    <Card>
      <SectionHeader title="Events" variant="accent" />
      {events.length === 0 ? (
        <Text style={shared.emptyText}>No events yet.</Text>
      ) : (
        events.map((event) => (
          <EventRow key={event.id} event={event} onRemove={() => onRemove(event.id)} />
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  minute: {
    ...typography.caption,
    color: colors.textSecondary,
    width: spacing.lg,
  },
  player: {
    ...typography.body,
    color: colors.text,
  },
  detail: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  spacer: {
    flex: 1,
  },
  action: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  cancel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  remove: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  cardIcon: {
    width: 10,
    height: 14,
    borderRadius: 2,
  },
});
