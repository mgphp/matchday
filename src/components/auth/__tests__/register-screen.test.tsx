import { render, userEvent } from '@testing-library/react-native';

import { RegisterScreen } from '../register-screen';

describe('RegisterScreen', () => {
  it('disables submit until all fields are filled', async () => {
    const { getByText } = await render(
      <RegisterScreen onSubmit={jest.fn()} onBackToLogin={jest.fn()} />,
    );
    expect(getByText('Register')).toBeDisabled();
  });

  it('submits the full registration', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <RegisterScreen onSubmit={onSubmit} onBackToLogin={jest.fn()} />,
    );

    await userEvent.type(getByLabelText('Your name'), 'Mark');
    await userEvent.type(getByLabelText('Email'), 'coach@example.com');
    await userEvent.type(getByLabelText('Password'), 'password123');
    await userEvent.type(getByLabelText('Club name'), 'Junior Hoops');
    await userEvent.type(getByLabelText('Team name'), 'Under 10 Bears');
    await userEvent.type(getByLabelText('Team short name (e.g. U10)'), 'U10');
    await userEvent.press(getByText('Register'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Mark',
      email: 'coach@example.com',
      password: 'password123',
      clubName: 'Junior Hoops',
      teamName: 'Under 10 Bears',
      teamShortName: 'U10',
    });
  });

  it('calls onBackToLogin when the sign-in link is pressed', async () => {
    const onBackToLogin = jest.fn();
    const { getByText } = await render(
      <RegisterScreen onSubmit={jest.fn()} onBackToLogin={onBackToLogin} />,
    );

    await userEvent.press(getByText('Already registered? Sign in'));

    expect(onBackToLogin).toHaveBeenCalled();
  });
});
