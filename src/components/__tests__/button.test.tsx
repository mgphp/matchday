import { render, userEvent } from '@testing-library/react-native';

import { Button } from '../button';

describe('Button', () => {
  it('renders its label', async () => {
    const { getByText } = await render(<Button label="Match centre" />);
    expect(getByText('Match centre')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Tap" onPress={onPress} />);
    await userEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Tap" onPress={onPress} disabled />);
    await userEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
