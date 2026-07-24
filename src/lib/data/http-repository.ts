import type { Match, MatchDetail, Player, Standing } from '@/lib/types';

import type { MatchdayRepository } from './repository';

interface HttpRepositoryOptions {
  baseUrl: string;
  teamId: string;
  getAccessToken: () => Promise<string>;
}

async function request<T>(
  { baseUrl, getAccessToken }: HttpRepositoryOptions,
  path: string,
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`matchday-api ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** matchday-api's Match type doesn't carry a venue field yet — default it until that lands. */
function withVenue<T extends { venue?: string }>(match: T): T & { venue: string } {
  return { ...match, venue: match.venue ?? '' };
}

/** MatchdayRepository backed by the real matchday-api, scoped to one team. */
export function createHttpRepository(options: HttpRepositoryOptions): MatchdayRepository {
  const { teamId } = options;
  return {
    getFixtures: async () => {
      const matches = await request<Match[]>(options, `teams/${teamId}/fixtures`);
      return matches.map(withVenue);
    },
    getMatch: async (id) => {
      const match = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`);
      return withVenue(match);
    },
    getTable: () => request<Standing[]>(options, `teams/${teamId}/table`),
    getSquad: () => request<Player[]>(options, `teams/${teamId}/squad`),
  };
}
