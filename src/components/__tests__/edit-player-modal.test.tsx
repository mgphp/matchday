import { render, userEvent } from '@testing-library/react-native';

import type { Player } from '@/lib/types';

import { EditPlayerModal } from '../edit-player-modal';

const player: Player = { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 };

describe('EditPlayerModal', () => {
  it('pre-fills the form from the player', async () => {
    const { getByLabelText } = await render(
      <EditPlayerModal
        visible
        player={player}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(getByLabelText('Name').props.value).toBe('Sam Okafor');
    expect(getByLabelText('Squad number').props.value).toBe('1');
    expect(getByLabelText('GK').props.accessibilityState.selected).toBe(true);
  });

  it('submits the edited player', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { getByLabelText, getByText } = await render(
      <EditPlayerModal
        visible
        player={player}
        onClose={onClose}
        onSubmit={onSubmit}
        onRemove={jest.fn()}
      />,
    );

    await userEvent.clear(getByLabelText('Name'));
    await userEvent.type(getByLabelText('Name'), 'Sam O.');
    await userEvent.press(getByLabelText('DF'));
    await userEvent.press(getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Sam O.',
      position: 'DF',
      squadNumber: 1,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('removes the player only after a second confirming press', async () => {
    const onRemove = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { getByText } = await render(
      <EditPlayerModal
        visible
        player={player}
        onClose={onClose}
        onSubmit={jest.fn()}
        onRemove={onRemove}
      />,
    );

    await userEvent.press(getByText('Remove player'));
    expect(onRemove).not.toHaveBeenCalled();

    await userEvent.press(getByText('Tap again to confirm removal'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error and stays open when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { getByText, findByText } = await render(
      <EditPlayerModal
        visible
        player={player}
        onClose={onClose}
        onSubmit={onSubmit}
        onRemove={jest.fn()}
      />,
    );

    await userEvent.press(getByText('Save'));

    expect(await findByText(/Could not save the player/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
