import type { Match, MatchDetail, Player, Standing } from '@/lib/types';

import type {
  LineupUpdate,
  MatchClockUpdate,
  MatchdayRepository,
  MatchScoreUpdate,
  NewFixtureInput,
  NewMatchEvent,
} from './repository';

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

/** Same tradeoff as generatePlayerId — a single coach records these. */
function generateEventId(): string {
  return `e-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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
    updatePlayer: async (player) => {
      const squad = await request<Player[]>(options, `teams/${teamId}/squad`);
      const updated = squad.map((existing) => (existing.id === player.id ? player : existing));
      await request<Player[]>(options, `teams/${teamId}/squad`, { method: 'PUT', body: updated });
      return player;
    },
    removePlayer: async (id) => {
      const squad = await request<Player[]>(options, `teams/${teamId}/squad`);
      await request<Player[]>(options, `teams/${teamId}/squad`, {
        method: 'PUT',
        body: squad.filter((player) => player.id !== id),
      });
    },
    restorePlayer: async (player) => {
      const squad = await request<Player[]>(options, `teams/${teamId}/squad`);
      // Guard against a double-tap on Undo re-adding the same player twice.
      if (squad.some((existing) => existing.id === player.id)) return player;
      await request<Player[]>(options, `teams/${teamId}/squad`, {
        method: 'PUT',
        body: [...squad, player],
      });
      return player;
    },
    createMatch: async (input: NewFixtureInput) => {
      const match = await request<MatchDetail>(options, `teams/${teamId}/matches`, {
        method: 'POST',
        // matchday-api ignores unknown fields on write and returns them
        // unchanged on read, so `venue` round-trips fine despite not being
        // part of its declared Match type yet.
        body: { ...input, status: 'scheduled' },
      });
      return withVenue(match);
    },
    updateMatchScore: async (id, update: MatchScoreUpdate) => {
      const match = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`, {
        method: 'PATCH',
        body: update,
      });
      return withVenue(match);
    },
    updateMatchClock: async (id, update: MatchClockUpdate) => {
      const match = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`, {
        method: 'PATCH',
        // `periods` round-trips the same way `venue` and `formation` do — the
        // API stores and returns fields it doesn't declare. `minute: null`
        // clears the legacy value so it can't shadow the derived clock.
        body: { ...update, minute: null },
      });
      return withVenue(match);
    },
    addEvent: async (id, event: NewMatchEvent) => {
      // Same shape as updateLineup: the API's PATCH replaces `events` rather
      // than appending, so read the current timeline first. No dedicated
      // event endpoint is needed.
      const current = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`);
      const events = [...(current.events ?? []), { ...event, id: generateEventId() }].sort(
        (a, b) => a.minute - b.minute,
      );
      const match = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`, {
        method: 'PATCH',
        body: { events },
      });
      return withVenue(match);
    },
    updateLineup: async (id, update: LineupUpdate) => {
      // The API replaces the whole `lineups` object on PATCH (no deep merge),
      // so read the current match first to keep the other side untouched.
      const current = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`);
      const slotsKey = update.side === 'home' ? 'homeSlots' : 'awaySlots';
      const lineups = {
        ...(current.lineups ?? { home: [], away: [] }),
        [update.side]: update.players,
        [slotsKey]: update.slots,
      };
      const match = await request<MatchDetail>(options, `teams/${teamId}/matches/${id}`, {
        method: 'PATCH',
        // `formation` round-trips the same way `venue` does — see withVenue above.
        // `homeSlots`/`awaySlots` round-trip the same way, as undeclared fields.
        // `availablePlayerIds: null` clears it, so unticking everyone back to
        // "whole squad available" actually sticks rather than leaving a stale list.
        body: {
          lineups,
          ...(update.formation !== undefined ? { formation: update.formation } : {}),
          availablePlayerIds: update.availablePlayerIds ?? null,
        },
      });
      return withVenue(match);
    },
  };
}
