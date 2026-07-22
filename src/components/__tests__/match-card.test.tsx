import { render, userEvent } from '@testing-library/react-native';

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
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows kickoff time only for a fixture on the current day', async () => {
    const { getByText } = await render(<MatchCard match={base} />);
    expect(getByText('19:45')).toBeTruthy();
    expect(getByText('Northgate Rovers v Harbour City')).toBeTruthy();
  });

  it('shows kickoff date and time for a fixture on another day', async () => {
    const future: Match = { ...base, kickoff: '2026-07-23T19:45:00Z' };
    const { getByText } = await render(<MatchCard match={future} />);
    expect(getByText('Thu 23 Jul, 19:45')).toBeTruthy();
  });

  it('shows the live badge and scoreline for a live match', async () => {
    const live: Match = { ...base, status: 'live', homeScore: 1, awayScore: 0, minute: 62 };
    const { getByText } = await render(<MatchCard match={live} />);
    expect(getByText("LIVE 62'")).toBeTruthy();
    expect(getByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<MatchCard match={base} onPress={onPress} />);
    await userEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes a descriptive accessibility label', async () => {
    const live: Match = { ...base, status: 'live', homeScore: 1, awayScore: 0, minute: 62 };
    const { getByLabelText } = await render(<MatchCard match={live} onPress={() => {}} />);
    expect(
      getByLabelText('Northgate Rovers 1 – 0 Harbour City, Premier League, live, minute 62'),
    ).toBeTruthy();
  });

  it('shows the amber postponed badge', async () => {
    const postponed: Match = { ...base, status: 'postponed' };
    const { getByText } = await render(<MatchCard match={postponed} />);
    expect(getByText('Postponed')).toBeTruthy();
  });
});
