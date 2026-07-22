import { render } from '@testing-library/react-native';

import SquadScreen from '@/app/(tabs)/squad';

jest.mock('@/lib/data', () => ({
  repository: {
    getSquad: async () => [
      { id: 'p1', name: 'Test Keeper', position: 'GK', squadNumber: 1 },
      { id: 'p2', name: 'Test Striker', position: 'FW', squadNumber: 9 },
    ],
  },
}));

describe('SquadScreen', () => {
  it('groups players under position headers and omits empty sections', async () => {
    const { findByText, queryByText } = await render(<SquadScreen />);

    expect(await findByText('Goalkeepers')).toBeTruthy();
    expect(await findByText('Forwards')).toBeTruthy();
    expect(queryByText('Defenders')).toBeNull();
    expect(queryByText('Midfielders')).toBeNull();

    expect(await findByText('Test Keeper')).toBeTruthy();
    expect(await findByText('Test Striker')).toBeTruthy();
  });
});
