import { render, userEvent } from '@testing-library/react-native';

import { NewPasswordScreen } from '../new-password-screen';

describe('NewPasswordScreen', () => {
  it('disables submit until the password meets the minimum length', async () => {
    const { getByLabelText, getByText } = await render(
      <NewPasswordScreen email="coach@example.com" onSubmit={jest.fn()} />,
    );

    expect(getByText('Set password')).toBeDisabled();
    await userEvent.type(getByLabelText('New password'), 'short');
    expect(getByText('Set password')).toBeDisabled();
  });

  it('submits the new password once valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <NewPasswordScreen email="coach@example.com" onSubmit={onSubmit} />,
    );

    await userEvent.type(getByLabelText('New password'), 'newPassword123');
    await userEvent.press(getByText('Set password'));

    expect(onSubmit).toHaveBeenCalledWith('newPassword123');
  });
});
