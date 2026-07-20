import type { Match, MatchDetail, Player, Standing } from '@/lib/types';

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
}
