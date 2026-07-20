import type { Match, Player, Standing, Team } from '@/lib/types';

import type { MatchdayRepository } from './repository';

const teams: Record<string, Team> = {
  rovers: { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR' },
  harbour: { id: 'harbour', name: 'Harbour City', shortName: 'HBC' },
  athletic: { id: 'athletic', name: 'Kings Athletic', shortName: 'KGA' },
  wanderers: { id: 'wanderers', name: 'Westfield Wanderers', shortName: 'WFW' },
  united: { id: 'united', name: 'Milltown United', shortName: 'MTU' },
  county: { id: 'county', name: 'Redbrook County', shortName: 'RBC' },
};

const fixtures: Match[] = [
  {
    id: 'm1',
    competition: 'Premier League',
    kickoff: '2026-07-20T16:30:00Z',
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
    status: 'scheduled',
    home: teams.athletic,
    away: teams.wanderers,
  },
  {
    id: 'm3',
    competition: 'FA Cup',
    kickoff: '2026-07-22T15:00:00Z',
    status: 'postponed',
    home: teams.united,
    away: teams.county,
  },
  {
    id: 'm4',
    competition: 'Premier League',
    kickoff: '2026-07-18T15:00:00Z',
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

/** Simulated network latency so loading states are visible in the app. */
const LATENCY_MS = 300;

function respond<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), LATENCY_MS));
}

export const mockRepository: MatchdayRepository = {
  getFixtures: () => respond(fixtures),
  getTable: () => respond(table),
  getSquad: () => respond(squad),
};
