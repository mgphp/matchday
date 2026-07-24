import { render, userEvent } from '@testing-library/react-native';

import { TeamPickerScreen } from '../team-picker-screen';

const teams = [
  { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10', clubId: 'club-1' },
  { id: 'team-2', name: 'Under 12 Bears', shortName: 'U12', clubId: 'club-1' },
];

describe('TeamPickerScreen', () => {
  it('lists every team and reports the selected one', async () => {
    const onSelect = jest.fn();
    const { getByText, getByLabelText } = await render(
      <TeamPickerScreen teams={teams} onSelect={onSelect} />,
    );

    expect(getByText('Under 10 Bears')).toBeTruthy();
    expect(getByText('Under 12 Bears')).toBeTruthy();

    await userEvent.press(getByLabelText('Under 12 Bears'));

    expect(onSelect).toHaveBeenCalledWith('team-2');
  });
});
