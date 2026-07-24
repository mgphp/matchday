import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { colors, spacing, typography } from '@/theme/theme';

export function ConfirmScreen({
  email,
  onSubmit,
}: {
  email: string;
  onSubmit: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit(code.trim());
    } catch {
      setError('Could not confirm. Check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Confirm your email" variant="accent" />
      <Card style={styles.card}>
        <Text style={styles.hint}>Enter the confirmation code emailed to {email}.</Text>
        <TextField
          label="Confirmation code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? 'Confirming…' : 'Confirm'}
          onPress={handleSubmit}
          disabled={isSubmitting || !code}
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
