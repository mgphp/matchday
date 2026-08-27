import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { colors, spacing, typography } from '@/theme/theme';

/**
 * Self-serve password reset. Step 1 requests a one-time code by email; step 2
 * sets a new password with that code. On success the coach is handed back to
 * the login screen to sign in normally.
 */
export function ForgotPasswordScreen({
  onRequestCode,
  onResetPassword,
  onBackToLogin,
}: {
  onRequestCode: (email: string) => Promise<void>;
  onResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  onBackToLogin: () => void;
}) {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestCode = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onRequestCode(email.trim());
      setStep('reset');
    } catch {
      setError('Could not send a reset code. Check your email and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onResetPassword(email.trim(), code.trim(), newPassword);
      onBackToLogin();
    } catch {
      setError('Could not reset your password. Check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Reset your password" variant="accent" />
      <Card style={styles.card}>
        {step === 'request' ? (
          <>
            <Text style={styles.hint}>
              Enter your email and we&apos;ll send you a one-time reset code.
            </Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label={isSubmitting ? 'Sending…' : 'Send reset code'}
              onPress={requestCode}
              disabled={isSubmitting || !email}
            />
          </>
        ) : (
          <>
            <Text style={styles.hint}>Enter the code emailed to {email} and a new password.</Text>
            <TextField
              label="Reset code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            <TextField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              textContentType="newPassword"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label={isSubmitting ? 'Saving…' : 'Set new password'}
              onPress={resetPassword}
              disabled={isSubmitting || !code || newPassword.length < 8}
            />
          </>
        )}
        <Button label="Back to sign in" variant="secondary" onPress={onBackToLogin} />
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
