import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { colors, spacing, typography } from '@/theme/theme';

/** Shown when Cognito rejects a temporary password and requires a permanent one. */
export function NewPasswordScreen({
  email,
  onSubmit,
}: {
  email: string;
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit(newPassword);
    } catch {
      setError('Could not set a new password. It must be at least 8 characters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Set a new password" variant="accent" />
      <Card style={styles.card}>
        <Text style={styles.hint}>
          First sign-in for {email} — choose a permanent password to replace the temporary one.
        </Text>
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          textContentType="newPassword"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Saving…' : 'Set password'}
          onPress={handleSubmit}
          disabled={isSubmitting || newPassword.length < 8}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
