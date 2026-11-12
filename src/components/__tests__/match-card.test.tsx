import { render, userEvent } from '@testing-library/react-native';

import type { Match } from '@/lib/types';
import { colors } from '@/theme/theme';

import { MatchCard } from '../match-card';

const base: Match = {
  id: 'm1',
  competition: 'Premier League',
  kickoff: '2026-07-21T19:45:00Z',
  venue: 'Northgate Park',
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
    expect(getByText('Northgate Rovers')).toBeTruthy();
    expect(getByText('Harbour City')).toBeTruthy();
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
    expect(getByText('1')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
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

  it('hides scores before kick-off', async () => {
    const { queryByText } = await render(<MatchCard match={base} />);
    expect(queryByText('0')).toBeNull();
  });

  it('marks our side, home or away, without a result before full time', async () => {
    const { getByText, queryByText, getByLabelText } = await render(
      <MatchCard
        match={{ ...base, home: base.away, away: base.home }}
        ownTeamId="a"
        onPress={() => {}}
      />,
    );
    expect(getByText('A')).toBeTruthy();
    expect(queryByText('W')).toBeNull();
    expect(getByText('Northgate Rovers')).toHaveStyle({ color: colors.accent });
    expect(getByText('Harbour City')).not.toHaveStyle({ color: colors.accent });
    expect(getByLabelText(/Premier League, away game, kick-off/)).toBeTruthy();
  });

  it.each([
    [2, 1, 'W', 'won'],
    [1, 1, 'D', 'drew'],
    [0, 3, 'L', 'lost'],
  ])('shows %i–%i at home as %s', async (homeScore, awayScore, letter, word) => {
    const finished: Match = { ...base, status: 'finished', homeScore, awayScore };
    const { getByText, getByLabelText } = await render(
      <MatchCard match={finished} ownTeamId="a" onPress={() => {}} />,
    );
    expect(getByText('H')).toBeTruthy();
    expect(getByText(letter)).toBeTruthy();
    expect(getByLabelText(new RegExp(`home game, ${word}, full time$`))).toBeTruthy();
  });

  it('reads the result from our side when away', async () => {
    const finished: Match = { ...base, status: 'finished', homeScore: 2, awayScore: 1 };
    const { getByText } = await render(<MatchCard match={finished} ownTeamId="b" />);
    expect(getByText('L')).toBeTruthy();
  });

  it('marks nothing without an own team', async () => {
    const finished: Match = { ...base, status: 'finished', homeScore: 2, awayScore: 1 };
    const { queryByText } = await render(<MatchCard match={finished} />);
    expect(queryByText('H')).toBeNull();
    expect(queryByText('W')).toBeNull();
  });
});
