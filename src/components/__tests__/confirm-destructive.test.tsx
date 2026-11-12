import { render, userEvent } from '@testing-library/react-native';

import { ConfirmDestructive } from '../confirm-destructive';

async function renderConfirm(overrides: Partial<Parameters<typeof ConfirmDestructive>[0]> = {}) {
  const props = {
    description: 'Removes the thing.',
    triggerLabel: 'Remove thing',
    warning: 'Delete the thing?',
    confirmLabel: 'Delete thing',
    busyLabel: 'Removing…',
    onConfirm: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { props, ...(await render(<ConfirmDestructive {...props} />)) };
}

describe('ConfirmDestructive', () => {
  it('shows a labelled danger zone with only the trigger at first', async () => {
    const { getByLabelText, getByText, queryByText } = await renderConfirm();

    expect(getByLabelText('Danger zone')).toBeTruthy();
    expect(getByText('Removes the thing.')).toBeTruthy();
    expect(queryByText('Delete the thing?')).toBeNull();
  });

  it('confirms only after the warning panel', async () => {
    const { props, getByText } = await renderConfirm();

    await userEvent.press(getByText('Remove thing'));
    expect(getByText('Delete the thing?')).toBeTruthy();
    expect(props.onConfirm).not.toHaveBeenCalled();

    await userEvent.press(getByText('Delete thing'));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('backs out with Cancel', async () => {
    const { props, getByText, queryByText } = await renderConfirm();

    await userEvent.press(getByText('Remove thing'));
    await userEvent.press(getByText('Cancel'));

    expect(queryByText('Delete the thing?')).toBeNull();
    expect(getByText('Remove thing')).toBeTruthy();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('collapses and reports the error when confirming fails', async () => {
    const failure = new Error('nope');
    const onError = jest.fn();
    const { getByText, findByText } = await renderConfirm({
      onConfirm: jest.fn().mockRejectedValue(failure),
      onError,
    });

    await userEvent.press(getByText('Remove thing'));
    await userEvent.press(getByText('Delete thing'));

    expect(await findByText('Remove thing')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('disables the trigger when asked', async () => {
    const { getByText } = await renderConfirm({ disabled: true });

    expect(getByText('Remove thing')).toBeDisabled();
  });
});
