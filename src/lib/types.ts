export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export type MatchPeriodName = 'first' | 'second';

/**
 * One played period of a match. The clock is derived from these timestamps
 * rather than stored as a number, so the minute keeps advancing while the app
 * is closed and survives a restart.
 */
export interface MatchPeriod {
  period: MatchPeriodName;
  /** ISO 8601 instant the period kicked off */
  startedAt: string;
  /** ISO 8601 instant the period was stopped — absent while it is in progress */
  endedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
}

export interface Match {
  id: string;
  competition: string;
  /** ISO 8601 kickoff time */
  kickoff: string;
  venue: string;
  status: MatchStatus;
  home: Team;
  away: Team;
  homeScore?: number;
  awayScore?: number;
  /**
   * Periods played so far, in order. Source of truth for the match clock.
   * Absent on a fixture that has not kicked off.
   */
  periods?: MatchPeriod[];
  /**
   * Legacy hand-entered minute, kept for fixtures created before the clock
   * existed. Only used when `periods` is absent — see `src/lib/match-clock.ts`.
   */
  minute?: number;
  /** Our team's shape for this match, e.g. "2-3-1". Free text — squad sizes vary (7-, 9-a-side, etc.). */
  formation?: string;
}

export interface Standing {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  squadNumber: number;
}

export type MatchEventType = 'goal' | 'yellow-card' | 'red-card' | 'substitution';

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  player: string;
  side: 'home' | 'away';
  /** e.g. assist or player coming off */
  detail?: string;
  /**
   * Squad id of `player`, when they are one of ours. Display uses `player`;
   * anything that has to reason about *which* player (who is on the pitch,
   * minutes played) needs this, because names aren't stable identifiers.
   */
  playerId?: string;
  /**
   * Squad id of the other player involved — for a substitution, the one going
   * off. Named generically so a goal could later record its assister here.
   */
  relatedPlayerId?: string;
}

export interface Lineups {
  home: Player[];
  away: Player[];
}

export interface MatchDetail extends Match {
  events: MatchEvent[];
  /** Absent until teams are announced */
  lineups?: Lineups;
}
