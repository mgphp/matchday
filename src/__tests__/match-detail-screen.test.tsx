import { useLocalSearchParams } from 'expo-router';
import { render, userEvent } from '@testing-library/react-native';

import MatchDetailScreen from '@/app/match/[id]';
import { mockRepository } from '@/lib/data/mock-repository';
import { TeamProvider } from '@/lib/team-context';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

const ownTeam = { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR', clubId: 'club-1' };

function renderScreen() {
  return render(
    <TeamProvider team={ownTeam}>
      <MatchDetailScreen />
    </TeamProvider>,
  );
}

describe('MatchDetailScreen', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm1' });
  });

  it('renders score, events and lineups for a live match', async () => {
    const { findByText, getByText } = await renderScreen();
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(getByText("LIVE 62'")).toBeTruthy();
    expect(getByText('Northgate Park')).toBeTruthy();
    expect(getByText('Jamie Cole')).toBeTruthy();
    expect(getByText('assist Ryo Tanaka')).toBeTruthy();
    expect(getByText('13 Felix Ndiaye')).toBeTruthy();
  });

  it('summarises the single goal scorer under the scoreline', async () => {
    const { findByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    expect(await findByText('Jamie Cole 34′')).toBeTruthy();
  });

  it('summarises multiple scorers per side, grouping repeat scorers by minute', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm4' });

    const { findByText } = await renderScreen();
    await findByText('Westfield Wanderers 2 – 2 Northgate Rovers');

    expect(await findByText('Callum Reed 12′, 79′')).toBeTruthy();
    expect(await findByText('Jamie Cole 27′\nRyo Tanaka 90′')).toBeTruthy();
  });

  it('omits the scorers summary when there are no goal events', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm2' });

    const { findByText, queryByText } = await renderScreen();
    await findByText('Kings Athletic v Westfield Wanderers');

    expect(queryByText(/′/)).toBeNull();
  });

  it('derives the live minute from the clock once a match kicks off', async () => {
    // m3 is the seeded postponed fixture; reset it so it behaves as an
    // un-kicked-off match without disturbing the fixtures the other tests use.
    await mockRepository.updateMatchScore('m3', { status: 'scheduled' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm3' });

    const { findByText, getByText } = await renderScreen();
    await findByText('Milltown United v Redbrook County');
    expect(getByText('Kick-off upcoming')).toBeTruthy();

    await userEvent.press(getByText('Kick off'));

    // Derived from the period we just started, so the clock reads 0 minutes.
    expect(await findByText("LIVE 0'")).toBeTruthy();
    expect(getByText('Half time')).toBeTruthy();
  });

  it('shows a stopped clock and a Second half control at half time', async () => {
    await mockRepository.updateMatchClock('m3', {
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-07-22T15:00:00Z', endedAt: '2026-07-22T15:25:00Z' },
      ],
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm3' });

    const { findByText, getByText } = await renderScreen();

    expect(await findByText("Half time 25'")).toBeTruthy();
    expect(getByText('Second half')).toBeTruthy();
  });

  it('falls back to the stored minute for a match with no recorded periods', async () => {
    const { findByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    expect(await findByText("LIVE 62'")).toBeTruthy();
  });

  it('opens the lineup editor from the Edit lineup button', async () => {
    const { findByText, getByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    await userEvent.press(getByText('Edit lineup'));

    expect(await findByText('Save lineup')).toBeTruthy();
  });
});
