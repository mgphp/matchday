import { render, userEvent } from '@testing-library/react-native';

import SquadScreen from '@/app/(tabs)/squad';
import { repository } from '@/lib/data';

jest.mock('@/lib/data', () => ({
  repository: {
    getSquad: jest.fn(async () => [
      { id: 'p1', name: 'Test Keeper', position: 'GK', squadNumber: 1 },
      { id: 'p2', name: 'Test Striker', position: 'FW', squadNumber: 9 },
    ]),
    addPlayer: jest.fn(),
  },
}));

const mockGetSquad = jest.mocked(repository.getSquad);
const mockAddPlayer = jest.mocked(repository.addPlayer);

describe('SquadScreen', () => {
  beforeEach(() => {
    mockGetSquad.mockClear();
    mockAddPlayer.mockClear();
  });

  it('groups players under position headers and omits empty sections', async () => {
    const { findByText, queryByText } = await render(<SquadScreen />);

    expect(await findByText('Goalkeepers')).toBeTruthy();
    expect(await findByText('Forwards')).toBeTruthy();
    expect(queryByText('Defenders')).toBeNull();
    expect(queryByText('Midfielders')).toBeNull();

    expect(await findByText('Test Keeper')).toBeTruthy();
    expect(await findByText('Test Striker')).toBeTruthy();
  });

  it('opens the add-player modal, submits, and reloads the squad', async () => {
    mockAddPlayer.mockResolvedValue({ id: 'p3', name: 'New Kid', position: 'MF', squadNumber: 8 });
    const { findByText, getByText, getByLabelText } = await render(<SquadScreen />);

    await findByText('Test Keeper');
    await userEvent.press(getByText('Add player'));

    await userEvent.type(getByLabelText('Name'), 'New Kid');
    await userEvent.press(getByLabelText('MF'));
    await userEvent.type(getByLabelText('Squad number'), '8');
    await userEvent.press(getByText('Add'));

    expect(mockAddPlayer).toHaveBeenCalledWith({ name: 'New Kid', position: 'MF', squadNumber: 8 });
    expect(mockGetSquad).toHaveBeenCalledTimes(2);
  });
});
