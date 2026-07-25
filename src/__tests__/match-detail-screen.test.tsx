import { useLocalSearchParams } from 'expo-router';
import { render } from '@testing-library/react-native';

import MatchDetailScreen from '@/app/match/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

describe('MatchDetailScreen', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm1' });
  });

  it('renders score, events and lineups for a live match', async () => {
    const { findByText, getByText } = await render(<MatchDetailScreen />);
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(getByText("LIVE 62'")).toBeTruthy();
    expect(getByText('Northgate Park')).toBeTruthy();
    expect(getByText('Jamie Cole')).toBeTruthy();
    expect(getByText('assist Ryo Tanaka')).toBeTruthy();
    expect(getByText('13 Felix Ndiaye')).toBeTruthy();
  });

  it('summarises the single goal scorer under the scoreline', async () => {
    const { findByText } = await render(<MatchDetailScreen />);
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    expect(await findByText('Jamie Cole 34′')).toBeTruthy();
  });

  it('summarises multiple scorers per side, grouping repeat scorers by minute', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm4' });

    const { findByText } = await render(<MatchDetailScreen />);
    await findByText('Westfield Wanderers 2 – 2 Northgate Rovers');

    expect(await findByText('Callum Reed 12′, 79′')).toBeTruthy();
    expect(await findByText('Jamie Cole 27′\nRyo Tanaka 90′')).toBeTruthy();
  });

  it('omits the scorers summary when there are no goal events', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm2' });

    const { findByText, queryByText } = await render(<MatchDetailScreen />);
    await findByText('Kings Athletic v Westfield Wanderers');

    expect(queryByText(/′/)).toBeNull();
  });
});
