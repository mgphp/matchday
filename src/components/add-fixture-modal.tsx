import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { DatePicker } from '@/components/date-picker';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { TimePicker } from '@/components/time-picker';
import type { NewFixtureInput } from '@/lib/data/repository';
import { describeFixture, findClashingFixture } from '@/lib/fixture-clash';
import {
  DEFAULT_COMPETITION,
  deriveShortName,
  loadLastCompetition,
  saveLastCompetition,
} from '@/lib/fixture-defaults';
import type { Match, Team } from '@/lib/types';
import { colors, typography } from '@/theme/theme';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const SIDES = ['home', 'away'] as const;
type Side = (typeof SIDES)[number];

/** Not cryptographically unique — fine for a client-generated opponent id. */
function generateOpponentId(): string {
  return `opp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function AddFixtureModal({
  visible,
  onClose,
  ownTeam,
  existingFixtures = [],
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  ownTeam: Team;
  /** Fixtures already in the diary, used to warn about a clashing kickoff. */
  existingFixtures?: Match[];
  onSubmit: (input: NewFixtureInput) => Promise<void>;
}) {
  const [opponentName, setOpponentName] = useState('');
  const [opponentShortName, setOpponentShortName] = useState('');
  const [competition, setCompetition] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [side, setSide] = useState<Side | null>(null);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCompetition, setLastCompetition] = useState('');

  // Prefill Competition with whatever this team used last time.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void loadLastCompetition(ownTeam.id).then((stored) => {
      if (cancelled) return;
      setLastCompetition(stored);
      setCompetition((current) => current || stored);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, ownTeam.id]);

  const derivedShortName = deriveShortName(opponentName);

  const isComplete =
    opponentName.trim().length > 0 &&
    DATE_PATTERN.test(date) &&
    TIME_PATTERN.test(time) &&
    side !== null;

  // Advisory only — the coach knows their own diary better than this rule
  // does, so a clash never disables Add.
  const clash =
    DATE_PATTERN.test(date) && TIME_PATTERN.test(time)
      ? findClashingFixture(existingFixtures, `${date}T${time}:00Z`)
      : undefined;

  const reset = () => {
    setOpponentName('');
    setOpponentShortName('');
    setCompetition(lastCompetition);
    setVenue('');
    setDate('');
    setTime('');
    setSide(null);
    setError(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!side) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const opponent: Team = {
        id: generateOpponentId(),
        name: opponentName.trim(),
        shortName: (opponentShortName.trim() || derivedShortName).toUpperCase(),
      };
      const chosenCompetition = competition.trim() || DEFAULT_COMPETITION;
      await onSubmit({
        competition: chosenCompetition,
        // Stored as a literal UTC-labelled wall-clock time, matching every
        // other kickoff in this app (see mock-repository / seed data).
        kickoff: `${date}T${time}:00Z`,
        venue: venue.trim(),
        home: side === 'home' ? ownTeam : opponent,
        away: side === 'home' ? opponent : ownTeam,
      });
      await saveLastCompetition(ownTeam.id, chosenCompetition);
      setLastCompetition(chosenCompetition);
      reset();
      setCompetition(chosenCompetition);
      onClose();
    } catch {
      setError('Could not add the fixture. Try again.');
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
          <SectionHeader title="Add fixture" variant="accent" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <ChoiceChips
          label="Venue"
          options={SIDES}
          optionLabels={{ home: 'Home', away: 'Away' }}
          value={side}
          onChange={setSide}
        />
        <TextField label="Opponent" value={opponentName} onChangeText={setOpponentName} />
        <TextField
          label="Short name (optional)"
          value={opponentShortName}
          onChangeText={setOpponentShortName}
          autoCapitalize="characters"
          placeholder={derivedShortName || 'e.g. HBC'}
        />
        <DatePicker label="Date" value={date} onChange={setDate} />
        <TimePicker label="Kick-off" value={time} onChange={setTime} />
        <TextField
          label="Competition (optional)"
          value={competition}
          onChangeText={setCompetition}
          placeholder={DEFAULT_COMPETITION}
        />
        <TextField label="Ground (optional)" value={venue} onChangeText={setVenue} />
        {clash ? (
          <Text style={styles.warning}>
            You already have a fixture around then — {describeFixture(clash, ownTeam.id)}. Add it
            anyway if that&#8217;s right.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Adding…' : 'Add'}
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
  warning: {
    ...typography.caption,
    color: colors.alert,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
