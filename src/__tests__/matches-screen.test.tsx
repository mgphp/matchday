import { render } from '@testing-library/react-native';

import MatchesScreen from '@/app/(tabs)/index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('MatchesScreen', () => {
  it('shows three skeleton cards while fixtures are loading', async () => {
    const { getAllByLabelText, findByText } = await render(<MatchesScreen />);

    expect(getAllByLabelText('Loading fixture')).toHaveLength(3);

    await findByText('Upcoming');
  });

  it('renders fixtures from the repository after loading', async () => {
    const { findByText } = await render(<MatchesScreen />);
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(await findByText('Kings Athletic v Westfield Wanderers')).toBeTruthy();
  });

  it('groups fixtures under Upcoming and Previous headers', async () => {
    const { findByText } = await render(<MatchesScreen />);

    expect(await findByText('Upcoming')).toBeTruthy();
    expect(await findByText('Previous')).toBeTruthy();
    // live, scheduled and postponed fixtures are all "Upcoming"
    expect(await findByText('Kings Athletic v Westfield Wanderers')).toBeTruthy();
    expect(await findByText('Milltown United v Redbrook County')).toBeTruthy();
    // finished fixture is "Previous"
    expect(await findByText('Westfield Wanderers 2 – 2 Northgate Rovers')).toBeTruthy();
  });
});
