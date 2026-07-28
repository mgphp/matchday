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
  init?: { method: string; body: unknown },
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: init?.method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init ? { 'content-type': 'application/json' } : {}),
    },
    body: init ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`matchday-api ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** matchday-api's Match type doesn't carry a venue field yet — default it until that lands. */
function withVenue<T extends { venue?: string }>(match: T): T & { venue: string } {
  return { ...match, venue: match.venue ?? '' };
}

/** Not cryptographically unique — fine for a client-generated squad entry id. */
function generatePlayerId(): string {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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
    addPlayer: async (player) => {
      // matchday-api only exposes a whole-array PUT for the squad, not an
      // atomic append — read-modify-write here, same tradeoff as the
      // migration/seed scripts. Fine for a single-coach team.
      const squad = await request<Player[]>(options, `teams/${teamId}/squad`);
      const newPlayer: Player = { ...player, id: generatePlayerId() };
      await request<Player[]>(options, `teams/${teamId}/squad`, {
        method: 'PUT',
        body: [...squad, newPlayer],
      });
      return newPlayer;
    },
  };
}
