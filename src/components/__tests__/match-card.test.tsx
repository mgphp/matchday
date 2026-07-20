import { render } from '@testing-library/react-native';

import type { Match } from '@/lib/types';

import { MatchCard } from '../match-card';

const base: Match = {
  id: 'm1',
  competition: 'Premier League',
  kickoff: '2026-07-21T19:45:00Z',
  status: 'scheduled',
  home: { id: 'a', name: 'Northgate Rovers', shortName: 'NGR' },
  away: { id: 'b', name: 'Harbour City', shortName: 'HBC' },
};

describe('MatchCard', () => {
  it('shows kickoff time for a scheduled match', async () => {
    const { getByText } = await render(<MatchCard match={base} />);
    expect(getByText('19:45')).toBeTruthy();
    expect(getByText('Northgate Rovers v Harbour City')).toBeTruthy();
  });

  it('shows the live badge and scoreline for a live match', async () => {
    const live: Match = { ...base, status: 'live', homeScore: 1, awayScore: 0, minute: 62 };
    const { getByText } = await render(<MatchCard match={live} />);
    expect(getByText("LIVE 62'")).toBeTruthy();
    expect(getByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
  });

  it('shows the amber postponed badge', async () => {
    const postponed: Match = { ...base, status: 'postponed' };
    const { getByText } = await render(<MatchCard match={postponed} />);
    expect(getByText('Postponed')).toBeTruthy();
  });
});
