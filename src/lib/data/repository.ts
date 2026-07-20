import type { Match, Player, Standing } from '@/lib/types';

/**
 * Data source contract for the app. Screens depend on this interface only,
 * so the mock implementation can be swapped for a real API without UI changes.
 */
export interface MatchdayRepository {
  getFixtures(): Promise<Match[]>;
  getTable(): Promise<Standing[]>;
  getSquad(): Promise<Player[]>;
}
