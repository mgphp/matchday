import AsyncStorage from '@react-native-async-storage/async-storage';
import { render } from '@testing-library/react-native';

import MatchesScreen from '@/app/(tabs)/index';
import { TeamProvider } from '@/lib/team-context';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const ownTeam = { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR', clubId: 'club-1' };

function renderScreen() {
  return render(
    <TeamProvider team={ownTeam}>
      <MatchesScreen />
    </TeamProvider>,
  );
}

/** Fixture rows only — excludes the "Add fixture" button, which is also role="button". */
async function findFixtureLabels(findAllByRole: (role: string) => Promise<{ props: unknown }[]>) {
  const buttons = await findAllByRole('button');
  return buttons
    .map((button) => (button.props as { accessibilityLabel?: string }).accessibilityLabel)
    .filter((label): label is string => Boolean(label) && label !== 'Add fixture');
}

describe('MatchesScreen', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows three skeleton cards while fixtures are loading', async () => {
    const { getAllByLabelText, findByText } = await renderScreen();

    expect(getAllByLabelText('Loading fixture')).toHaveLength(3);

    await findByText('Upcoming');
  });

  it('renders fixtures from the repository after loading', async () => {
    const { findByText } = await renderScreen();
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(await findByText('Kings Athletic v Westfield Wanderers')).toBeTruthy();
  });

  it('groups fixtures under Upcoming and Previous headers', async () => {
    const { findByText } = await renderScreen();

    expect(await findByText('Upcoming')).toBeTruthy();
    expect(await findByText('Previous')).toBeTruthy();
    // live, scheduled and postponed fixtures are all "Upcoming"
    expect(await findByText('Kings Athletic v Westfield Wanderers')).toBeTruthy();
    expect(await findByText('Milltown United v Redbrook County')).toBeTruthy();
    // finished fixture is "Previous"
    expect(await findByText('Westfield Wanderers 2 – 2 Northgate Rovers')).toBeTruthy();
  });

  it("pins the favourite team's fixtures to the top of each section", async () => {
    await AsyncStorage.setItem('matchday:favouriteTeamId', 'county');

    const { findAllByRole, findByText } = await renderScreen();
    await findByText('Upcoming');
    const labels = await findFixtureLabels(findAllByRole);

    // Redbrook County (county) is favourite: their postponed fixture leads Upcoming,
    // and the mid-table live/scheduled fixtures follow, unaffected in relative order.
    expect(labels[0]).toContain('Milltown United v Redbrook County');
    expect(labels[1]).toContain('Northgate Rovers 1 – 0 Harbour City');
    expect(labels[2]).toContain('Kings Athletic v Westfield Wanderers');
    // county have no "Previous" fixture, so that section is untouched.
    expect(labels[3]).toContain('Westfield Wanderers 2 – 2 Northgate Rovers');
  });

  it('does not reorder fixtures when no favourite team is set', async () => {
    const { findAllByRole, findByText } = await renderScreen();
    await findByText('Upcoming');
    const labels = await findFixtureLabels(findAllByRole);

    expect(labels[0]).toContain('Northgate Rovers 1 – 0 Harbour City');
    expect(labels[1]).toContain('Kings Athletic v Westfield Wanderers');
    expect(labels[2]).toContain('Milltown United v Redbrook County');
  });
});
