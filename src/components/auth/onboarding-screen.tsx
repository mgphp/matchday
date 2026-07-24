import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { colors, spacing, typography } from '@/theme/theme';

export interface OnboardingDetails {
  coachName?: string;
  clubName?: string;
  teamName: string;
  teamShortName: string;
}

/**
 * Fallback setup screen for a signed-in coach without a club/team yet — e.g.
 * signing in on a new device after registering elsewhere. The normal
 * registration flow (RegisterScreen) collects this up front and skips this
 * screen entirely.
 */
export function OnboardingScreen({
  needsCoachProfile,
  onSubmit,
}: {
  needsCoachProfile: boolean;
  onSubmit: (details: OnboardingDetails) => Promise<void>;
}) {
  const [coachName, setCoachName] = useState('');
  const [clubName, setClubName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamShortName, setTeamShortName] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete = needsCoachProfile
    ? coachName && clubName && teamName && teamShortName
    : teamName && teamShortName;

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        coachName: needsCoachProfile ? coachName.trim() : undefined,
        clubName: needsCoachProfile ? clubName.trim() : undefined,
        teamName: teamName.trim(),
        teamShortName: teamShortName.trim(),
      });
    } catch {
      setError('Could not finish setup. Check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Finish setting up" variant="accent" />
      <Card style={styles.card}>
        {needsCoachProfile ? (
          <>
            <TextField label="Your name" value={coachName} onChangeText={setCoachName} />
            <TextField label="Club name" value={clubName} onChangeText={setClubName} />
          </>
        ) : null}
        <TextField label="Team name" value={teamName} onChangeText={setTeamName} />
        <TextField
          label="Team short name (e.g. U10)"
          value={teamShortName}
          onChangeText={setTeamShortName}
          autoCapitalize="characters"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : 'Continue'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
