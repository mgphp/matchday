import { useRouter } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';

import { MatchCard } from '@/components/match-card';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import { useData } from '@/lib/use-data';
import { colors, spacing } from '@/theme/theme';

export default function MatchesScreen() {
  const router = useRouter();
  const { status, data, reload, refresh, isRefreshing } = useData(repository.getFixtures);

  return (
    <Screen>
      {status === 'loading' ? (
        <StateView state="loading" />
      ) : status === 'error' ? (
        <StateView state="error" message="Could not load fixtures." onRetry={reload} />
      ) : data.length === 0 ? (
        <StateView state="empty" message="No fixtures scheduled." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(match) => match.id}
          renderItem={({ item }) => (
            <MatchCard match={item} onPress={() => router.push(`/match/${item.id}`)} />
          )}
          contentContainerStyle={{ gap: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </Screen>
  );
}
