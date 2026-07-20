import { render } from '@testing-library/react-native';

import MatchesScreen from '@/app/index';

describe('MatchesScreen', () => {
  it('renders fixtures from the repository after loading', async () => {
    const { findByText } = await render(<MatchesScreen />);
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(await findByText('Kings Athletic v Westfield Wanderers')).toBeTruthy();
  });
});
