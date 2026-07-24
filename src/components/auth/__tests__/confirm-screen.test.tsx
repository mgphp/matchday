import { render, userEvent } from '@testing-library/react-native';

import { ConfirmScreen } from '../confirm-screen';

describe('ConfirmScreen', () => {
  it('shows the email and submits the entered code', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByLabelText } = await render(
      <ConfirmScreen email="coach@example.com" onSubmit={onSubmit} />,
    );

    expect(getByText(/coach@example.com/)).toBeTruthy();

    await userEvent.type(getByLabelText('Confirmation code'), '123456');
    await userEvent.press(getByText('Confirm'));

    expect(onSubmit).toHaveBeenCalledWith('123456');
  });
});
