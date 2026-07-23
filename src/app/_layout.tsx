import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { colors } from '@/theme/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="match/[id]" options={{ title: 'Match centre' }} />
      </Stack>
    </>
  );
}

/** Themed fallback shown by expo-router when a screen throws during render. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <>
      <StatusBar style="light" />
      <Screen>
        <StateView
          state="error"
          message={error.message || 'Something went wrong.'}
          onRetry={retry}
        />
      </Screen>
    </>
  );
}
