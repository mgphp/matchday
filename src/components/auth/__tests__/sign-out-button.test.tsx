import { render, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/lib/auth/auth-context';

import { SignOutButton } from '../sign-out-button';

jest.mock('@/lib/auth/auth-context');

describe('SignOutButton', () => {
  it('calls signOut when pressed', async () => {
    const signOut = jest.fn();
    jest.mocked(useAuth).mockReturnValue({ signOut } as unknown as ReturnType<typeof useAuth>);

    const { getByLabelText } = await render(<SignOutButton />);
    await userEvent.press(getByLabelText('Sign out'));

    expect(signOut).toHaveBeenCalled();
  });
});
