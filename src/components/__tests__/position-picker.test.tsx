import { render, userEvent } from '@testing-library/react-native';

import { PositionPicker } from '../position-picker';

describe('PositionPicker', () => {
  it('marks every picked position as selected and names the main one', async () => {
    const { getByLabelText, getByText } = await render(
      <PositionPicker value={['DF', 'MF']} onChange={jest.fn()} />,
    );

    expect(getByLabelText('DF').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('MF').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('GK').props.accessibilityState).toMatchObject({ selected: false });
    expect(getByText(/Main position: DF/)).toBeTruthy();
  });

  it('adds a pressed position after the existing ones', async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await render(<PositionPicker value={['DF']} onChange={onChange} />);

    await userEvent.press(getByLabelText('FW'));

    expect(onChange).toHaveBeenCalledWith(['DF', 'FW']);
  });

  it('removes a position pressed again, promoting the next to main', async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await render(
      <PositionPicker value={['DF', 'MF']} onChange={onChange} />,
    );

    await userEvent.press(getByLabelText('DF'));

    expect(onChange).toHaveBeenCalledWith(['MF']);
  });
});
