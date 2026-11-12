import type { Match } from '@/lib/types';

function isUpcoming(match: Match) {
  return match.status !== 'finished';
}

function isFavourite(match: Match, teamId: string | null) {
  return teamId != null && (match.home.id === teamId || match.away.id === teamId);
}

/** Stable sort that pins the favourite team's fixtures to the top of a section. */
function pinFavourite(matches: Match[], teamId: string | null) {
  if (teamId == null) return matches;
  return [...matches].sort(
    (a, b) => Number(isFavourite(b, teamId)) - Number(isFavourite(a, teamId)),
  );
}

function byKickoff(direction: 1 | -1) {
  return (a: Match, b: Match) => direction * a.kickoff.localeCompare(b.kickoff);
}

/**
 * The Matches list sections. Upcoming runs soonest first; Previous runs most
 * recent first, so last weekend's result sits at the top rather than under a
 * season of older ones. Empty sections are dropped.
 */
export function groupByStatus(matches: Match[], teamId: string | null) {
  return [
    {
      title: 'Upcoming',
      data: pinFavourite(matches.filter(isUpcoming).sort(byKickoff(1)), teamId),
    },
    {
      title: 'Previous',
      data: pinFavourite(matches.filter((match) => !isUpcoming(match)).sort(byKickoff(-1)), teamId),
    },
  ].filter((section) => section.data.length > 0);
}
