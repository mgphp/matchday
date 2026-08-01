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
    updatePlayer: jest.fn(),
    removePlayer: jest.fn(),
    restorePlayer: jest.fn(),
  },
}));

const mockGetSquad = jest.mocked(repository.getSquad);
const mockAddPlayer = jest.mocked(repository.addPlayer);
const mockUpdatePlayer = jest.mocked(repository.updatePlayer);
const mockRemovePlayer = jest.mocked(repository.removePlayer);
const mockRestorePlayer = jest.mocked(repository.restorePlayer);

describe('SquadScreen', () => {
  beforeEach(() => {
    mockGetSquad.mockClear();
    mockAddPlayer.mockClear();
    mockUpdatePlayer.mockClear();
    mockRemovePlayer.mockClear();
    mockRestorePlayer.mockClear();
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

  it('gives each player row a descriptive accessibility label', async () => {
    const { findByLabelText } = await render(<SquadScreen />);

    expect(await findByLabelText('Number 1, Test Keeper, Goalkeeper')).toBeTruthy();
    expect(await findByLabelText('Number 9, Test Striker, Forward')).toBeTruthy();
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

  it('opens the edit-player modal on row press, saves, and reloads the squad', async () => {
    mockUpdatePlayer.mockResolvedValue({
      id: 'p1',
      name: 'Renamed Keeper',
      position: 'GK',
      squadNumber: 1,
    });
    const { findByLabelText, getByLabelText, getByText } = await render(<SquadScreen />);

    await userEvent.press(await findByLabelText('Number 1, Test Keeper, Goalkeeper'));
    await userEvent.clear(getByLabelText('Name'));
    await userEvent.type(getByLabelText('Name'), 'Renamed Keeper');
    await userEvent.press(getByText('Save'));

    expect(mockUpdatePlayer).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Renamed Keeper',
      position: 'GK',
      squadNumber: 1,
    });
    expect(mockGetSquad).toHaveBeenCalledTimes(2);
  });

  it('removes a player after a second confirming tap', async () => {
    mockRemovePlayer.mockResolvedValue(undefined);
    const { findByLabelText, getByText } = await render(<SquadScreen />);

    await userEvent.press(await findByLabelText('Number 1, Test Keeper, Goalkeeper'));
    await userEvent.press(getByText('Remove player'));
    expect(mockRemovePlayer).not.toHaveBeenCalled();

    await userEvent.press(getByText('Tap again to confirm removal'));

    expect(mockRemovePlayer).toHaveBeenCalledWith('p1');
    expect(mockGetSquad).toHaveBeenCalledTimes(2);
  });

  it('offers an undo after removing a player, restoring the same id', async () => {
    mockRemovePlayer.mockResolvedValue(undefined);
    mockRestorePlayer.mockImplementation(async (player) => player);
    const { findByLabelText, findByText, getByText, getByLabelText } = await render(
      <SquadScreen />,
    );

    await userEvent.press(await findByLabelText('Number 1, Test Keeper, Goalkeeper'));
    await userEvent.press(getByText('Remove player'));
    await userEvent.press(getByText('Tap again to confirm removal'));

    expect(await findByText('Removed Test Keeper')).toBeTruthy();

    await userEvent.press(getByLabelText('Undo'));

    // The original id comes back, not a freshly minted one.
    expect(mockRestorePlayer).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Test Keeper',
      position: 'GK',
      squadNumber: 1,
    });
    expect(mockAddPlayer).not.toHaveBeenCalled();
  });

  it('has no undo banner until something is removed', async () => {
    const { findByLabelText, queryByLabelText } = await render(<SquadScreen />);
    await findByLabelText('Number 1, Test Keeper, Goalkeeper');

    expect(queryByLabelText('Undo')).toBeNull();
  });
});
