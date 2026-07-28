import { useLocalSearchParams } from 'expo-router';
import { render, userEvent } from '@testing-library/react-native';

import MatchDetailScreen from '@/app/match/[id]';
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

  it('opens the lineup editor from the Edit lineup button', async () => {
    const { findByText, getByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    await userEvent.press(getByText('Edit lineup'));

    expect(await findByText('Save lineup')).toBeTruthy();
  });
});
