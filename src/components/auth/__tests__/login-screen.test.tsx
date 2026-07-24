import { render, userEvent } from '@testing-library/react-native';

import { LoginScreen } from '../login-screen';

describe('LoginScreen', () => {
  it('submits the entered email and password', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <LoginScreen onSubmit={onSubmit} onRegister={jest.fn()} />,
    );

    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.type(getByLabelText('Password'), 'password123');
    await userEvent.press(getByText('Sign in'));

    expect(onSubmit).toHaveBeenCalledWith('coach@example.com', 'password123');
  });

  it('shows an error message when sign-in fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const { getByLabelText, getByText, findByText } = await render(
      <LoginScreen onSubmit={onSubmit} onRegister={jest.fn()} />,
    );

    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.type(getByLabelText('Password'), 'wrong');
    await userEvent.press(getByText('Sign in'));

    expect(await findByText(/Could not sign in/)).toBeTruthy();
  });

  it('calls onRegister when the register link is pressed', async () => {
    const onRegister = jest.fn();
    const { getByText } = await render(
      <LoginScreen onSubmit={jest.fn()} onRegister={onRegister} />,
    );

    await userEvent.press(getByText('New coach? Register'));

    expect(onRegister).toHaveBeenCalled();
  });
});
