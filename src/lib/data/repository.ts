import type { Match, MatchDetail, MatchStatus, Player, Standing, Team } from '@/lib/types';

export interface NewFixtureInput {
  competition: string;
  kickoff: string;
  venue: string;
  home: Team;
  away: Team;
}

export interface MatchScoreUpdate {
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}

export interface LineupUpdate {
  /** Which side is ours — the other side's lineup, if any, is left untouched. */
  side: 'home' | 'away';
  formation?: string;
  players: Player[];
}

/**
 * Data source contract for the app. Screens depend on this interface only,
 * so the mock implementation can be swapped for a real API without UI changes.
 */
export interface MatchdayRepository {
  getFixtures(): Promise<Match[]>;
  /** Rejects when no match exists for the id. */
  getMatch(id: string): Promise<MatchDetail>;
  getTable(): Promise<Standing[]>;
  getSquad(): Promise<Player[]>;
  /** Appends a player to the squad (id generated) and returns it. */
  addPlayer(player: Omit<Player, 'id'>): Promise<Player>;
  /** Replaces one player's details, keyed by id. */
  updatePlayer(player: Player): Promise<Player>;
  /** Removes a player from the squad. */
  removePlayer(id: string): Promise<void>;
  /** Creates a new fixture (id generated) and returns the full match detail. */
  createMatch(input: NewFixtureInput): Promise<MatchDetail>;
  /** Updates a match's score/status/minute. Rejects when no match exists for the id. */
  updateMatchScore(id: string, update: MatchScoreUpdate): Promise<MatchDetail>;
  /** Sets our starting lineup and formation for a match. Rejects when no match exists for the id. */
  updateLineup(id: string, update: LineupUpdate): Promise<MatchDetail>;
}
