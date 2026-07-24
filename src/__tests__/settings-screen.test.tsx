import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, userEvent } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('SettingsScreen', () => {
  it('lists teams and marks the persisted favourite as selected', async () => {
    await AsyncStorage.setItem('matchday:favouriteTeamId', 'harbour');

    const { findByLabelText } = await render(<SettingsScreen />);

    expect(await findByLabelText('Harbour City, selected')).toBeTruthy();
    expect(await findByLabelText('Northgate Rovers')).toBeTruthy();
  });

  it('persists a new favourite when a team is tapped, and clears it on second tap', async () => {
    const { findByLabelText } = await render(<SettingsScreen />);
    const rovers = await findByLabelText('Northgate Rovers');

    await userEvent.press(rovers);
    expect(await findByLabelText('Northgate Rovers, selected')).toBeTruthy();
    expect(await AsyncStorage.getItem('matchday:favouriteTeamId')).toBe('rovers');

    await userEvent.press(await findByLabelText('Northgate Rovers, selected'));
    expect(await findByLabelText('Northgate Rovers')).toBeTruthy();
    expect(await AsyncStorage.getItem('matchday:favouriteTeamId')).toBeNull();
  });
});
