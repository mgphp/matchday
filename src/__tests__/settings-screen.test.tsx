import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, userEvent } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import { TeamProvider } from '@/lib/team-context';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const ownTeam = { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR', clubId: 'club-1' };

function renderSettings() {
  return render(
    <TeamProvider team={ownTeam}>
      <SettingsScreen />
    </TeamProvider>,
  );
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults the match format to 7-a-side, 50 minutes', async () => {
    const { findByLabelText, getByLabelText } = await renderSettings();

    expect((await findByLabelText('7-a-side')).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByLabelText('Match length (minutes)').props.value).toBe('50');
  });

  it('resets the length when the team size changes, and persists both', async () => {
    const { findByLabelText, getByLabelText } = await renderSettings();

    await userEvent.press(await findByLabelText('9-a-side'));
    expect(getByLabelText('Match length (minutes)').props.value).toBe('60');

    await userEvent.clear(getByLabelText('Match length (minutes)'));
    await userEvent.type(getByLabelText('Match length (minutes)'), '70');

    expect(JSON.parse((await AsyncStorage.getItem('matchday:matchFormat:rovers')) ?? '')).toEqual({
      teamSize: 9,
      durationMinutes: 70,
    });
  });

  it('lists teams and marks the persisted favourite as selected', async () => {
    await AsyncStorage.setItem('matchday:favouriteTeamId', 'harbour');

    const { findByLabelText } = await renderSettings();

    expect(await findByLabelText('Harbour City, selected')).toBeTruthy();
    expect(await findByLabelText('Northgate Rovers')).toBeTruthy();
  });

  it('persists a new favourite when a team is tapped, and clears it on second tap', async () => {
    const { findByLabelText } = await renderSettings();
    const rovers = await findByLabelText('Northgate Rovers');

    await userEvent.press(rovers);
    expect(await findByLabelText('Northgate Rovers, selected')).toBeTruthy();
    expect(await AsyncStorage.getItem('matchday:favouriteTeamId')).toBe('rovers');

    await userEvent.press(await findByLabelText('Northgate Rovers, selected'));
    expect(await findByLabelText('Northgate Rovers')).toBeTruthy();
    expect(await AsyncStorage.getItem('matchday:favouriteTeamId')).toBeNull();
  });
});
