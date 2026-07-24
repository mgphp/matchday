import { useRouter } from 'expo-router';
import { RefreshControl, SectionList, View } from 'react-native';

import { MatchCard } from '@/components/match-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { Match } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { colors, spacing } from '@/theme/theme';

const SKELETON_COUNT = 3;

function isUpcoming(match: Match) {
  return match.status !== 'finished';
}

function groupByStatus(matches: Match[]) {
  return [
    { title: 'Upcoming', data: matches.filter(isUpcoming) },
    { title: 'Previous', data: matches.filter((match) => !isUpcoming(match)) },
  ].filter((section) => section.data.length > 0);
}

export default function MatchesScreen() {
  const router = useRouter();
  const { status, data, reload, refresh, isRefreshing } = useData(repository.getFixtures);

  return (
    <Screen>
      {status === 'loading' ? (
        <View style={{ gap: spacing.md }}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      ) : status === 'error' ? (
        <StateView state="error" message="Could not load fixtures." onRetry={reload} />
      ) : data.length === 0 ? (
        <StateView state="empty" message="No fixtures scheduled." />
      ) : (
        <SectionList
          sections={groupByStatus(data)}
          keyExtractor={(match) => match.id}
          renderItem={({ item }) => (
            <MatchCard match={item} onPress={() => router.push(`/match/${item.id}`)} />
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          stickySectionHeadersEnabled={false}
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
