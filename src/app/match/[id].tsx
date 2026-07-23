import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StateView } from '@/components/state-view';
import { repository } from '@/lib/data';
import type { MatchDetail, MatchEvent, Player } from '@/lib/types';
import { useData } from '@/lib/use-data';
import { colors, spacing, typography } from '@/theme/theme';

/** How often a live match refetches in the background. */
const LIVE_POLL_MS = 30_000;

function statusBadge(match: MatchDetail) {
  switch (match.status) {
    case 'live':
      return <Badge label={`LIVE ${match.minute}'`} variant="live" />;
    case 'postponed':
      return <Badge label="Postponed" variant="alert" />;
    case 'finished':
      return <Badge label="Full time" />;
    case 'scheduled':
      return <Badge label="Kick-off upcoming" />;
  }
}

function eventIcon(type: MatchEvent['type']) {
  switch (type) {
    case 'goal':
      return <Ionicons name="football" size={16} color={colors.accent} />;
    case 'yellow-card':
      return <View style={[styles.cardIcon, { backgroundColor: colors.alert }]} />;
    case 'red-card':
      return <View style={[styles.cardIcon, { backgroundColor: colors.danger }]} />;
    case 'substitution':
      return <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />;
  }
}

function EventRow({ event }: { event: MatchEvent }) {
  return (
    <View style={styles.eventRow}>
      <Text style={styles.minute}>{event.minute}&#8242;</Text>
      {eventIcon(event.type)}
      <Text style={styles.eventPlayer}>{event.player}</Text>
      {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
    </View>
  );
}

function LineupColumn({ title, players }: { title: string; players: Player[] }) {
  return (
    <View style={styles.lineupColumn}>
      <Text style={styles.lineupTitle}>{title}</Text>
      {players.map((player) => (
        <Text key={player.id} style={styles.lineupPlayer}>
          {player.squadNumber} {player.name}
        </Text>
      ))}
    </View>
  );
}

function scoreline(match: MatchDetail) {
  if (match.status === 'scheduled' || match.status === 'postponed') {
    return `${match.home.name} v ${match.away.name}`;
  }
  return `${match.home.name} ${match.homeScore} – ${match.awayScore} ${match.away.name}`;
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getMatch = useCallback(() => repository.getMatch(String(id)), [id]);
  const { status, data, reload, refresh, isRefreshing } = useData(getMatch);

  const isLive = data?.status === 'live';
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(refresh, LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [isLive, refresh]);

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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <Card>
          <View style={styles.headerRow}>
            {statusBadge(data)}
            <Text style={styles.competition}>{data.competition}</Text>
          </View>
          <Text style={styles.score}>{scoreline(data)}</Text>
          <Text style={styles.venue}>{data.venue}</Text>
        </Card>

        <Card>
          <SectionHeader title="Events" variant="accent" />
          {data.events.length === 0 ? (
            <Text style={styles.emptyText}>No events yet.</Text>
          ) : (
            data.events.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </Card>

        <Card>
          <SectionHeader title="Lineups" variant="accent" />
          {data.lineups ? (
            <View style={styles.lineupsRow}>
              <LineupColumn title={data.home.shortName} players={data.lineups.home} />
              <LineupColumn title={data.away.shortName} players={data.lineups.away} />
            </View>
          ) : (
            <Text style={styles.emptyText}>Teams not announced yet.</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competition: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  score: {
    ...typography.title,
    color: colors.text,
  },
  venue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  minute: {
    ...typography.caption,
    color: colors.textSecondary,
    width: spacing.lg,
  },
  eventPlayer: {
    ...typography.body,
    color: colors.text,
  },
  eventDetail: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  cardIcon: {
    width: 10,
    height: 14,
    borderRadius: 2,
  },
  lineupsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  lineupColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  lineupTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  lineupPlayer: {
    ...typography.body,
    color: colors.text,
  },
});
