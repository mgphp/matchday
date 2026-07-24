import { render, userEvent } from '@testing-library/react-native';

import { TextField } from '../text-field';

describe('TextField', () => {
  it('renders a label and forwards text input', async () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = await render(
      <TextField label="Email" value="" onChangeText={onChangeText} />,
    );

    const input = getByLabelText('Email');
    await userEvent.type(input, 'coach@example.com');
    expect(onChangeText).toHaveBeenCalled();
  });

  it('shows an error message when provided', async () => {
    const { getByText } = await render(
      <TextField label="Email" value="" onChangeText={jest.fn()} error="Required" />,
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
