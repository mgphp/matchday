import { render } from '@testing-library/react-native';

import MatchDetailScreen from '@/app/match/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'm1' }),
}));

describe('MatchDetailScreen', () => {
  it('renders score, events and lineups for a live match', async () => {
    const { findByText, getByText } = await render(<MatchDetailScreen />);
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(getByText("LIVE 62'")).toBeTruthy();
    expect(getByText('Northgate Park')).toBeTruthy();
    expect(getByText('Jamie Cole')).toBeTruthy();
    expect(getByText('assist Ryo Tanaka')).toBeTruthy();
    expect(getByText('13 Felix Ndiaye')).toBeTruthy();
  });
});
