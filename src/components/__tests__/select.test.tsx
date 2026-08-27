import { render, userEvent } from '@testing-library/react-native';

import { Select } from '../select';

describe('Select', () => {
  it('shows the label and current value, with options hidden until opened', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <Select label="Team size" options={['5', '6', '7']} value="7" onChange={jest.fn()} />,
    );

    expect(getByLabelText('Team size, 7')).toBeTruthy();
    expect(queryByLabelText('5')).toBeNull();
  });

  it('opens on press and reports the picked option, then closes', async () => {
    const onChange = jest.fn();
    const { getByLabelText, queryByLabelText } = await render(
      <Select label="Team size" options={['5', '6', '7']} value="7" onChange={onChange} />,
    );

    await userEvent.press(getByLabelText('Team size, 7'));
    await userEvent.press(getByLabelText('5'));

    expect(onChange).toHaveBeenCalledWith('5');
    expect(queryByLabelText('6')).toBeNull();
  });

  it('marks the current value as selected in the open menu', async () => {
    const { getByLabelText } = await render(
      <Select label="Formation" options={['2-3-1', '3-2-1']} value="3-2-1" onChange={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Formation, 3-2-1'));

    expect(getByLabelText('3-2-1').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('2-3-1').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('uses optionLabels for display text when provided', async () => {
    const { getByLabelText, getByText } = await render(
      <Select
        label="Status"
        options={['scheduled', 'live']}
        optionLabels={{ scheduled: 'Scheduled', live: 'Live' }}
        value="scheduled"
        onChange={jest.fn()}
      />,
    );

    expect(getByLabelText('Status, Scheduled')).toBeTruthy();
    await userEvent.press(getByLabelText('Status, Scheduled'));
    expect(getByText('Live')).toBeTruthy();
  });
});
