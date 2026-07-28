import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import type { MatchScoreUpdate } from '@/lib/data/repository';
import type { Match, MatchStatus } from '@/lib/types';
import { colors, spacing, typography } from '@/theme/theme';

const STATUSES: MatchStatus[] = ['scheduled', 'live', 'finished', 'postponed'];
const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  finished: 'Finished',
  postponed: 'Postponed',
};

function hasScore(status: MatchStatus) {
  return status === 'live' || status === 'finished';
}

export function EditMatchModal({
  visible,
  onClose,
  match,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  match: Match;
  onSubmit: (update: MatchScoreUpdate) => Promise<void>;
}) {
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '');
  const [minute, setMinute] = useState(match.minute?.toString() ?? '');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedHome = Number(homeScore);
  const parsedAway = Number(awayScore);
  const parsedMinute = Number(minute);

  const isComplete =
    (!hasScore(status) ||
      (Number.isInteger(parsedHome) &&
        parsedHome >= 0 &&
        homeScore.length > 0 &&
        Number.isInteger(parsedAway) &&
        parsedAway >= 0 &&
        awayScore.length > 0)) &&
    (status !== 'live' ||
      (Number.isInteger(parsedMinute) && parsedMinute >= 0 && minute.length > 0));

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        status,
        homeScore: hasScore(status) ? parsedHome : undefined,
        awayScore: hasScore(status) ? parsedAway : undefined,
        minute: status === 'live' ? parsedMinute : undefined,
      });
      onClose();
    } catch {
      setError('Could not update the match. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <Screen>
        <View style={styles.header}>
          <SectionHeader title="Edit match" variant="accent" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <ChoiceChips
          label="Status"
          options={STATUSES}
          optionLabels={STATUS_LABELS}
          value={status}
          onChange={setStatus}
        />
        {hasScore(status) ? (
          <View style={styles.scoreRow}>
            <View style={styles.scoreField}>
              <TextField
                label={match.home.shortName}
                value={homeScore}
                onChangeText={setHomeScore}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.scoreField}>
              <TextField
                label={match.away.shortName}
                value={awayScore}
                onChangeText={setAwayScore}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ) : null}
        {status === 'live' ? (
          <TextField
            label="Minute"
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : 'Save'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    ...typography.body,
    color: colors.accent,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreField: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
