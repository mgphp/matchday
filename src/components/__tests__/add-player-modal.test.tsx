import { render, userEvent } from '@testing-library/react-native';

import { AddPlayerModal } from '../add-player-modal';

describe('AddPlayerModal', () => {
  it('disables submit until a name, position and squad number are set', async () => {
    const { getByLabelText, getByText } = await render(
      <AddPlayerModal visible onClose={jest.fn()} onSubmit={jest.fn()} />,
    );

    expect(getByText('Add')).toBeDisabled();

    await userEvent.type(getByLabelText('Name'), 'Jamie Cole');
    expect(getByText('Add')).toBeDisabled();

    await userEvent.press(getByLabelText('FW'));
    expect(getByText('Add')).toBeDisabled();

    await userEvent.type(getByLabelText('Squad number'), '9');
    expect(getByText('Add')).not.toBeDisabled();
  });

  it('submits the player and closes on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { getByLabelText, getByText } = await render(
      <AddPlayerModal visible onClose={onClose} onSubmit={onSubmit} />,
    );

    await userEvent.type(getByLabelText('Name'), 'Jamie Cole');
    await userEvent.press(getByLabelText('FW'));
    await userEvent.type(getByLabelText('Squad number'), '9');
    await userEvent.press(getByText('Add'));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Jamie Cole', position: 'FW', squadNumber: 9 });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error and stays open when submitting fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { getByLabelText, getByText, findByText } = await render(
      <AddPlayerModal visible onClose={onClose} onSubmit={onSubmit} />,
    );

    await userEvent.type(getByLabelText('Name'), 'Jamie Cole');
    await userEvent.press(getByLabelText('FW'));
    await userEvent.type(getByLabelText('Squad number'), '9');
    await userEvent.press(getByText('Add'));

    expect(await findByText(/Could not add the player/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes via the Close button', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await render(
      <AddPlayerModal visible onClose={onClose} onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });
});
