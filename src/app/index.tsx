import { FlatList } from 'react-native';

import { MatchCard } from '@/components/match-card';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import { useData } from '@/lib/use-data';
import { spacing } from '@/theme/theme';

export default function MatchesScreen() {
  const { status, data, reload } = useData(repository.getFixtures);

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
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={{ gap: spacing.md }}
        />
      )}
    </Screen>
  );
}
