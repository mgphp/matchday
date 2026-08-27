import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import type { MatchScoreUpdate } from '@/lib/data/repository';
import { DEFAULT_DURATION_MINUTES } from '@/lib/rotation';
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
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  match: Match;
  onSubmit: (update: MatchScoreUpdate) => Promise<void>;
  /** Deletes the fixture. The caller navigates away once it resolves. */
  onRemove: () => Promise<void>;
}) {
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '');
  const [duration, setDuration] = useState(
    (match.durationMinutes ?? DEFAULT_DURATION_MINUTES).toString(),
  );
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const parsedHome = Number(homeScore);
  const parsedAway = Number(awayScore);
  const parsedDuration = Number(duration);

  const isValidDuration =
    duration.length > 0 && Number.isInteger(parsedDuration) && parsedDuration > 0;

  const isComplete =
    isValidDuration &&
    (!hasScore(status) ||
      (Number.isInteger(parsedHome) &&
        parsedHome >= 0 &&
        homeScore.length > 0 &&
        Number.isInteger(parsedAway) &&
        parsedAway >= 0 &&
        awayScore.length > 0));

  const handleClose = () => {
    setError(undefined);
    setConfirmingRemove(false);
    onClose();
  };

  const handleRemove = async () => {
    setError(undefined);
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      setError('Could not remove the match. Try again.');
      setIsRemoving(false);
      setConfirmingRemove(false);
    }
  };

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        status,
        homeScore: hasScore(status) ? parsedHome : undefined,
        awayScore: hasScore(status) ? parsedAway : undefined,
        durationMinutes: parsedDuration,
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
        <TextField
          label="Full-time minutes"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>
          Used to work out each player&#8217;s fair share of game time.
        </Text>
        {status === 'live' ? (
          <Text style={styles.hint}>
            The match minute comes from the clock — use Kick off / Half time / Full time on the
            match screen.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : 'Save'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />

        <View style={styles.removeSection}>
          {confirmingRemove ? (
            <>
              <Text style={styles.removeWarning}>
                Delete this fixture and its events? This can&#8217;t be undone.
              </Text>
              <View style={styles.removeActions}>
                <View style={styles.removeAction}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setConfirmingRemove(false)}
                    disabled={isRemoving}
                  />
                </View>
                <View style={styles.removeAction}>
                  <Button
                    label={isRemoving ? 'Removing…' : 'Delete fixture'}
                    onPress={handleRemove}
                    disabled={isRemoving}
                  />
                </View>
              </View>
            </>
          ) : (
            <Button
              label="Remove fixture"
              variant="secondary"
              onPress={() => setConfirmingRemove(true)}
            />
          )}
        </View>
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
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  removeSection: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  removeWarning: {
    ...typography.caption,
    color: colors.danger,
  },
  removeActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  removeAction: {
    flex: 1,
  },
});
