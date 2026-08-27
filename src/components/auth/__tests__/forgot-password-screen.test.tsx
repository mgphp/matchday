import { render, userEvent } from '@testing-library/react-native';

import { ForgotPasswordScreen } from '../forgot-password-screen';

function setup(overrides: Partial<Parameters<typeof ForgotPasswordScreen>[0]> = {}) {
  const props = {
    onRequestCode: jest.fn().mockResolvedValue(undefined),
    onResetPassword: jest.fn().mockResolvedValue(undefined),
    onBackToLogin: jest.fn(),
    ...overrides,
  };
  return { props };
}

describe('ForgotPasswordScreen', () => {
  it('requests a reset code for the entered email, then reveals the reset step', async () => {
    const { props } = setup();
    const { getByLabelText, getByText, findByLabelText } = await render(
      <ForgotPasswordScreen {...props} />,
    );

    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.press(getByText('Send reset code'));

    expect(props.onRequestCode).toHaveBeenCalledWith('coach@example.com');
    expect(await findByLabelText('Reset code')).toBeTruthy();
  });

  it('submits the code and new password, then returns to login', async () => {
    const { props } = setup();
    const { getByLabelText, getByText, findByLabelText } = await render(
      <ForgotPasswordScreen {...props} />,
    );

    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.press(getByText('Send reset code'));

    await userEvent.type(await findByLabelText('Reset code'), '123456');
    await userEvent.type(getByLabelText('New password'), 'newPassword123');
    await userEvent.press(getByText('Set new password'));

    expect(props.onResetPassword).toHaveBeenCalledWith(
      'coach@example.com',
      '123456',
      'newPassword123',
    );
    expect(props.onBackToLogin).toHaveBeenCalled();
  });

  it('shows an error and stays on the request step when the code request fails', async () => {
    const { props } = setup({ onRequestCode: jest.fn().mockRejectedValue(new Error('nope')) });
    const { getByLabelText, getByText, findByText, queryByLabelText } = await render(
      <ForgotPasswordScreen {...props} />,
    );

    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.press(getByText('Send reset code'));

    expect(await findByText(/Could not send a reset code/)).toBeTruthy();
    expect(queryByLabelText('Reset code')).toBeNull();
  });

  it('shows an error when the reset fails', async () => {
    const { props } = setup({
      onResetPassword: jest.fn().mockRejectedValue(new Error('bad code')),
    });
    const { getByLabelText, getByText, findByLabelText, findByText } = await render(
      <ForgotPasswordScreen {...props} />,
    );

    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.press(getByText('Send reset code'));

    await userEvent.type(await findByLabelText('Reset code'), '000000');
    await userEvent.type(getByLabelText('New password'), 'newPassword123');
    await userEvent.press(getByText('Set new password'));

    expect(await findByText(/Could not reset your password/)).toBeTruthy();
    expect(props.onBackToLogin).not.toHaveBeenCalled();
  });

  it('returns to login from the back link', async () => {
    const { props } = setup();
    const { getByText } = await render(<ForgotPasswordScreen {...props} />);

    await userEvent.press(getByText('Back to sign in'));

    expect(props.onBackToLogin).toHaveBeenCalled();
  });
});
