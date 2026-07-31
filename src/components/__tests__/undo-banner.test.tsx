import { render, userEvent, waitFor } from '@testing-library/react-native';

import { UndoBanner } from '@/components/undo-banner';

describe('UndoBanner', () => {
  it('shows the message and an Undo action', async () => {
    const { getByText, getByLabelText } = await render(
      <UndoBanner message="Removed Theo Banks" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(getByText('Removed Theo Banks')).toBeTruthy();
    expect(getByLabelText('Undo')).toBeTruthy();
  });

  it('calls onUndo when the action is pressed', async () => {
    const onUndo = jest.fn();
    const { getByLabelText } = await render(
      <UndoBanner message="Removed Theo Banks" onUndo={onUndo} onDismiss={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Undo'));

    expect(onUndo).toHaveBeenCalled();
  });

  it('dismisses itself once the timeout elapses', async () => {
    const onDismiss = jest.fn();
    await render(
      <UndoBanner
        message="Removed Theo Banks"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        timeoutMs={20}
      />,
    );

    await waitFor(() => expect(onDismiss).toHaveBeenCalled());
  });

  it('stays put when the timeout is disabled', async () => {
    const onDismiss = jest.fn();
    const { unmount } = await render(
      <UndoBanner
        message="Removed Theo Banks"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        timeoutMs={0}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(onDismiss).not.toHaveBeenCalled();
    unmount();
  });

  it('does not dismiss after unmounting', async () => {
    const onDismiss = jest.fn();
    const { unmount } = await render(
      <UndoBanner
        message="Removed Theo Banks"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        timeoutMs={30}
      />,
    );

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('takes a custom action label', async () => {
    const { getByLabelText } = await render(
      <UndoBanner
        message="Removed Theo Banks"
        actionLabel="Put back"
        onUndo={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(getByLabelText('Put back')).toBeTruthy();
  });
});
