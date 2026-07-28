import { createContext, useContext, type ReactNode } from 'react';

import type { ManagedTeam } from './coach-api';

const TeamContext = createContext<ManagedTeam | undefined>(undefined);

/** Provides the coach's active team (set once AuthGate resolves it). */
export function TeamProvider({ team, children }: { team: ManagedTeam; children: ReactNode }) {
  return <TeamContext.Provider value={team}>{children}</TeamContext.Provider>;
}

/** The signed-in coach's active team — only valid below AuthGate's `ready` state. */
export function useTeam(): ManagedTeam {
  const team = useContext(TeamContext);
  if (!team) throw new Error('useTeam must be used within a TeamProvider');
  return team;
}
