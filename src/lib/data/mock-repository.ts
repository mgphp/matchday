import type { Lineups, Match, MatchDetail, MatchEvent, Player, Standing, Team } from '@/lib/types';

import type {
  LineupUpdate,
  MatchClockUpdate,
  MatchdayRepository,
  MatchScoreUpdate,
  NewFixtureInput,
  NewMatchEvent,
} from './repository';

const teams: Record<string, Team> = {
  rovers: { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR' },
  harbour: { id: 'harbour', name: 'Harbour City', shortName: 'HBC' },
  athletic: { id: 'athletic', name: 'Kings Athletic', shortName: 'KGA' },
  wanderers: { id: 'wanderers', name: 'Westfield Wanderers', shortName: 'WFW' },
  united: { id: 'united', name: 'Milltown United', shortName: 'MTU' },
  county: { id: 'county', name: 'Redbrook County', shortName: 'RBC' },
};

/** Home venue for each team, used as the fixture venue. */
const venues: Record<string, string> = {
  rovers: 'Northgate Park',
  harbour: 'Harbour City Stadium',
  athletic: "King's Ground",
  wanderers: 'Westfield Arena',
  united: 'Milltown Lane',
  county: 'Redbrook Stadium',
};

const fixtures: Match[] = [
  {
    id: 'm1',
    competition: 'Premier League',
    kickoff: '2026-07-20T16:30:00Z',
    venue: venues.rovers,
    status: 'live',
    home: teams.rovers,
    away: teams.harbour,
    homeScore: 1,
    awayScore: 0,
    minute: 62,
  },
  {
    id: 'm2',
    competition: 'Premier League',
    kickoff: '2026-07-21T19:45:00Z',
    venue: venues.athletic,
    status: 'scheduled',
    home: teams.athletic,
    away: teams.wanderers,
  },
  {
    id: 'm3',
    competition: 'FA Cup',
    kickoff: '2026-07-22T15:00:00Z',
    venue: venues.united,
    status: 'postponed',
    home: teams.united,
    away: teams.county,
  },
  {
    id: 'm4',
    competition: 'Premier League',
    kickoff: '2026-07-18T15:00:00Z',
    venue: venues.wanderers,
    status: 'finished',
    home: teams.wanderers,
    away: teams.rovers,
    homeScore: 2,
    awayScore: 2,
  },
];

const table: Standing[] = [
  {
    position: 1,
    team: teams.rovers,
    played: 4,
    won: 3,
    drawn: 1,
    lost: 0,
    goalDifference: 7,
    points: 10,
  },
  {
    position: 2,
    team: teams.harbour,
    played: 4,
    won: 3,
    drawn: 0,
    lost: 1,
    goalDifference: 5,
    points: 9,
  },
  {
    position: 3,
    team: teams.athletic,
    played: 4,
    won: 2,
    drawn: 1,
    lost: 1,
    goalDifference: 2,
    points: 7,
  },
  {
    position: 4,
    team: teams.wanderers,
    played: 4,
    won: 1,
    drawn: 2,
    lost: 1,
    goalDifference: 0,
    points: 5,
  },
  {
    position: 5,
    team: teams.united,
    played: 4,
    won: 1,
    drawn: 0,
    lost: 3,
    goalDifference: -4,
    points: 3,
  },
  {
    position: 6,
    team: teams.county,
    played: 4,
    won: 0,
    drawn: 0,
    lost: 4,
    goalDifference: -10,
    points: 0,
  },
];

const squad: Player[] = [
  { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 },
  { id: 'p2', name: 'Danny Whitmore', position: 'DF', squadNumber: 2 },
  { id: 'p3', name: 'Luca Marchetti', position: 'DF', squadNumber: 5 },
  { id: 'p4', name: 'Theo Banks', position: 'MF', squadNumber: 8 },
  { id: 'p5', name: 'Ryo Tanaka', position: 'MF', squadNumber: 10 },
  { id: 'p6', name: 'Jamie Cole', position: 'FW', squadNumber: 9 },
  { id: 'p7', name: 'Andrés Vidal', position: 'FW', squadNumber: 11 },
];

const events: Record<string, MatchEvent[]> = {
  m1: [
    {
      id: 'e1',
      minute: 34,
      type: 'goal',
      player: 'Jamie Cole',
      side: 'home',
      detail: 'assist Ryo Tanaka',
    },
    { id: 'e2', minute: 51, type: 'yellow-card', player: 'Owen Prescott', side: 'away' },
    {
      id: 'e3',
      minute: 58,
      type: 'substitution',
      player: 'Andrés Vidal',
      side: 'home',
      detail: 'for Theo Banks',
      playerId: 'p7',
      relatedPlayerId: 'p4',
    },
  ],
  m4: [
    { id: 'e4', minute: 12, type: 'goal', player: 'Callum Reed', side: 'home' },
    { id: 'e5', minute: 27, type: 'goal', player: 'Jamie Cole', side: 'away' },
    { id: 'e6', minute: 66, type: 'red-card', player: 'Marcus Bell', side: 'home' },
    { id: 'e7', minute: 79, type: 'goal', player: 'Callum Reed', side: 'home' },
    { id: 'e8', minute: 90, type: 'goal', player: 'Ryo Tanaka', side: 'away' },
  ],
};

const lineups: Record<string, Lineups> = {
  m1: {
    home: squad.slice(0, 5),
    away: [
      { id: 'a1', name: 'Owen Prescott', position: 'DF', squadNumber: 4 },
      { id: 'a2', name: 'Felix Ndiaye', position: 'GK', squadNumber: 13 },
      { id: 'a3', name: 'Tomás Herrera', position: 'MF', squadNumber: 6 },
      { id: 'a4', name: 'Billy Craven', position: 'FW', squadNumber: 7 },
      { id: 'a5', name: 'Aaron Doyle', position: 'DF', squadNumber: 3 },
    ],
  },
};

/** Our team's formation per match, e.g. "2-3-1". */
const formations: Record<string, string> = {};

/** Simulated network latency so loading states are visible in the app. */
const LATENCY_MS = 300;

function respond<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), LATENCY_MS));
}

export const mockRepository: MatchdayRepository = {
  getFixtures: () => respond(fixtures),
  getMatch: (id) => {
    const match = fixtures.find((fixture) => fixture.id === id);
    if (!match) {
      return Promise.reject(new Error(`No match with id ${id}`));
    }
    return respond({
      ...match,
      events: events[id] ?? [],
      lineups: lineups[id],
      formation: formations[id],
    });
  },
  getTable: () => respond(table),
  getSquad: () => respond(squad),
  addPlayer: (player) => {
    const newPlayer: Player = { ...player, id: `p${squad.length + 1}` };
    squad.push(newPlayer);
    return respond(newPlayer);
  },
  updatePlayer: (player) => {
    const index = squad.findIndex((existing) => existing.id === player.id);
    if (index === -1) return Promise.reject(new Error(`No player with id ${player.id}`));
    squad[index] = player;
    return respond(player);
  },
  removePlayer: (id) => {
    const index = squad.findIndex((player) => player.id === id);
    if (index !== -1) squad.splice(index, 1);
    return respond(undefined);
  },
  restorePlayer: (player) => {
    // Appends rather than restoring the original index — the Squad screen
    // groups by position, so the ordering shift is invisible in practice.
    if (!squad.some((existing) => existing.id === player.id)) squad.push(player);
    return respond(player);
  },
  createMatch: (input: NewFixtureInput) => {
    const match: Match = { ...input, id: `m${fixtures.length + 1}`, status: 'scheduled' };
    fixtures.push(match);
    return respond<MatchDetail>({ ...match, events: [] });
  },
  updateMatchScore: (id, update: MatchScoreUpdate) => {
    const index = fixtures.findIndex((fixture) => fixture.id === id);
    if (index === -1) return Promise.reject(new Error(`No match with id ${id}`));
    fixtures[index] = { ...fixtures[index], ...update };
    return respond<MatchDetail>({
      ...fixtures[index],
      events: events[id] ?? [],
      lineups: lineups[id],
      formation: formations[id],
    });
  },
  updateMatchClock: (id, update: MatchClockUpdate) => {
    const index = fixtures.findIndex((fixture) => fixture.id === id);
    if (index === -1) return Promise.reject(new Error(`No match with id ${id}`));
    // Drop the legacy hand-entered minute: once a match has periods, the
    // clock is derived and a stale `minute` would only confuse things.
    const { minute: _legacyMinute, ...rest } = fixtures[index];
    fixtures[index] = { ...rest, ...update };
    return respond<MatchDetail>({
      ...fixtures[index],
      events: events[id] ?? [],
      lineups: lineups[id],
      formation: formations[id],
    });
  },
  addEvent: (id, event: NewMatchEvent) => {
    const match = fixtures.find((fixture) => fixture.id === id);
    if (!match) return Promise.reject(new Error(`No match with id ${id}`));
    const existing = events[id] ?? [];
    const added: MatchEvent = { ...event, id: `e-${id}-${existing.length + 1}` };
    // Keep the timeline in minute order — a coach can record a sub late.
    events[id] = [...existing, added].sort((a, b) => a.minute - b.minute);
    return respond<MatchDetail>({
      ...match,
      events: events[id],
      lineups: lineups[id],
      formation: formations[id],
    });
  },
  updateLineup: (id, update: LineupUpdate) => {
    const match = fixtures.find((fixture) => fixture.id === id);
    if (!match) return Promise.reject(new Error(`No match with id ${id}`));
    const current = lineups[id] ?? { home: [], away: [] };
    lineups[id] = { ...current, [update.side]: update.players };
    if (update.formation !== undefined) formations[id] = update.formation;
    return respond<MatchDetail>({
      ...match,
      events: events[id] ?? [],
      lineups: lineups[id],
      formation: formations[id],
    });
  },
};
