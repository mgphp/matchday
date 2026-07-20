export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

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
  status: MatchStatus;
  home: Team;
  away: Team;
  homeScore?: number;
  awayScore?: number;
  /** Current match minute, only when live */
  minute?: number;
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
