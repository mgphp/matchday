import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { colors, spacing, typography } from '@/theme/theme';

export interface PendingRegistration {
  name: string;
  email: string;
  password: string;
  clubName: string;
  teamName: string;
  teamShortName: string;
}

export function RegisterScreen({
  onSubmit,
  onBackToLogin,
}: {
  onSubmit: (registration: PendingRegistration) => Promise<void>;
  onBackToLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clubName, setClubName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamShortName, setTeamShortName] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete = name && email && password.length >= 8 && clubName && teamName && teamShortName;

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        password,
        clubName: clubName.trim(),
        teamName: teamName.trim(),
        teamShortName: teamShortName.trim(),
      });
    } catch {
      setError('Could not register. Check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Coach registration" variant="accent" />
      <Card style={styles.card}>
        <TextField label="Your name" value={name} onChangeText={setName} textContentType="name" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
        <TextField label="Club name" value={clubName} onChangeText={setClubName} />
        <TextField label="Team name" value={teamName} onChangeText={setTeamName} />
        <TextField
          label="Team short name (e.g. U10)"
          value={teamShortName}
          onChangeText={setTeamShortName}
          autoCapitalize="characters"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Registering…' : 'Register'}
          onPress={handleSubmit}
          disabled={isSubmitting || !isComplete}
        />
        <Button label="Already registered? Sign in" variant="secondary" onPress={onBackToLogin} />
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
