import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { EditLineupModal } from '@/components/edit-lineup-modal';
import { EditMatchModal } from '@/components/edit-match-modal';
import { EventsCard } from '@/components/match/events-card';
import { LineupCard } from '@/components/match/lineup-card';
import { MatchHeaderCard } from '@/components/match/match-header-card';
import { MinutesCard } from '@/components/match/minutes-card';
import { RotationPlanCard, RotationPlanPrompt } from '@/components/match/rotation-plan-card';
import { RecordEventModal } from '@/components/record-event-modal';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { SubstitutionModal } from '@/components/substitution-modal';
import { repository } from '@/lib/data';
import {
  applyClockAction,
  displayMinute,
  nextClockAction,
  runningPeriod,
  type ClockAction,
} from '@/lib/match-clock';
import { useMatchFormat } from '@/lib/match-format';
import { matchRotation } from '@/lib/match-rotation';
import { useTeam } from '@/lib/team-context';
import { useData } from '@/lib/use-data';
import { useNow } from '@/lib/use-now';
import { colors, spacing } from '@/theme/theme';

/** How often a live match refetches in the background. */
const LIVE_POLL_MS = 30_000;
/** How often the derived clock re-renders while a period is running. */
const CLOCK_TICK_MS = 1_000;

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getMatch = useCallback(() => repository.getMatch(String(id)), [id]);
  const { status, data, reload, refresh, isRefreshing } = useData(getMatch);
  const getSquad = useCallback(() => repository.getSquad(), []);
  const { data: squad } = useData(getSquad);
  const ownTeam = useTeam();
  const { format } = useMatchFormat(ownTeam.id);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLineup, setIsEditingLineup] = useState(false);
  const [isSubstituting, setIsSubstituting] = useState(false);
  const [isRecordingEvent, setIsRecordingEvent] = useState(false);

  const isLive = data?.status === 'live';
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(refresh, LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [isLive, refresh]);

  // Only tick while a period is actually running — at half time the clock is
  // stopped, so re-rendering every second would show the same number.
  const now = useNow(CLOCK_TICK_MS, runningPeriod(data?.periods) !== undefined);
  const [isUpdatingClock, setIsUpdatingClock] = useState(false);
  const clockAction = data ? nextClockAction(data) : undefined;
  const handleClockAction = async (action: ClockAction) => {
    if (!data) return;
    setIsUpdatingClock(true);
    try {
      await repository.updateMatchClock(data.id, applyClockAction(data, action, Date.now()));
      await refresh();
    } finally {
      setIsUpdatingClock(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <StateView state="loading" />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen>
        <StateView state="error" message="Could not load this match." onRetry={reload} />
      </Screen>
    );
  }

  const ownSide = data.home.id === ownTeam.id ? 'home' : 'away';
  const minute = displayMinute(data, now);
  // No length of its own → the team's format default (Settings).
  const duration = data.durationMinutes ?? format.durationMinutes;
  const rota = matchRotation({ match: data, squad, side: ownSide, minute, duration });
  // Only offer a substitution once the match has actually started — before
  // kick-off "who is on the pitch" is just the starting lineup, edited via
  // the lineup editor instead.
  const canSubstitute = data.status === 'live';
  // Goals and cards can also be filled in after the final whistle.
  const canRecordEvent = data.status === 'live' || data.status === 'finished';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <MatchHeaderCard
          match={data}
          minute={minute}
          clockAction={clockAction}
          isUpdatingClock={isUpdatingClock}
          onClockAction={handleClockAction}
          onEditMatch={() => setIsEditing(true)}
          onEditLineup={() => setIsEditingLineup(true)}
          onRecordEvent={canRecordEvent ? () => setIsRecordingEvent(true) : undefined}
          onSubstitute={canSubstitute ? () => setIsSubstituting(true) : undefined}
          nextOn={rota.nextOn}
          nextOff={rota.nextOff}
          plan={rota.plan}
        />

        {rota.hasMinutes ? (
          <MinutesCard onPitch={rota.onPitch} bench={rota.bench} missing={rota.missing} />
        ) : null}

        {rota.plan && (rota.isPreMatch || rota.plan.subs.length > 0) ? (
          <RotationPlanCard
            plan={rota.plan}
            isPreMatch={rota.isPreMatch}
            duration={duration}
            keeper={rota.keeper}
            lineup={rota.lineup}
          />
        ) : rota.isPreMatch && !rota.lineup?.length ? (
          <RotationPlanPrompt />
        ) : null}

        <EventsCard
          events={data.events}
          onRemove={async (eventId) => {
            await repository.removeEvent(data.id, eventId);
            await refresh();
          }}
        />

        <LineupCard
          title={data[ownSide].shortName}
          players={rota.lineup}
          formation={data.formation}
        />
      </ScrollView>
      <EditMatchModal
        visible={isEditing}
        onClose={() => setIsEditing(false)}
        match={data}
        defaultDurationMinutes={format.durationMinutes}
        onSubmit={async (update) => {
          await repository.updateMatchScore(data.id, update);
          await refresh();
        }}
        onRemove={async () => {
          await repository.removeMatch(data.id);
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
      />
      <EditLineupModal
        visible={isEditingLineup}
        onClose={() => setIsEditingLineup(false)}
        match={data}
        side={ownSide}
        defaultTeamSize={format.teamSize}
        onSubmit={async (update) => {
          await repository.updateLineup(data.id, update);
          await refresh();
        }}
      />
      <RecordEventModal
        visible={isRecordingEvent}
        onClose={() => setIsRecordingEvent(false)}
        match={data}
        side={ownSide}
        minute={minute}
        onSubmit={async (event) => {
          await repository.addEvent(data.id, event);
          await refresh();
        }}
      />
      <SubstitutionModal
        visible={isSubstituting}
        onClose={() => setIsSubstituting(false)}
        match={data}
        side={ownSide}
        minute={minute}
        onSubmit={async (event) => {
          await repository.addEvent(data.id, event);
          await refresh();
        }}
      />
    </Screen>
  );
}
