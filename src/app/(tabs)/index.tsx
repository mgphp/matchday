import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';

import { AddFixtureModal } from '@/components/add-fixture-modal';
import { Button } from '@/components/button';
import { MatchCard } from '@/components/match-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton-card';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import { useFavouriteTeam } from '@/lib/favourite-team';
import { groupByStatus } from '@/lib/fixture-sections';
import { useTeam } from '@/lib/team-context';
import { useData } from '@/lib/use-data';
import { colors, spacing } from '@/theme/theme';

const SKELETON_COUNT = 3;

export default function MatchesScreen() {
  const router = useRouter();
  const { status, data, reload, refresh, isRefreshing } = useData(repository.getFixtures);
  const { teamId } = useFavouriteTeam();
  const ownTeam = useTeam();
  const [isAddingFixture, setIsAddingFixture] = useState(false);

  // Pick up changes made on the match detail screen (a deleted fixture, an
  // edited score) when coming back to the list. Skip the first focus — the
  // initial load already fetched.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  return (
    <Screen>
      <Button label="Add fixture" onPress={() => setIsAddingFixture(true)} />
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
          sections={groupByStatus(data, teamId)}
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
      <AddFixtureModal
        visible={isAddingFixture}
        onClose={() => setIsAddingFixture(false)}
        ownTeam={ownTeam}
        existingFixtures={data ?? []}
        onSubmit={async (input) => {
          await repository.createMatch(input);
          await reload();
        }}
      />
    </Screen>
  );
}
