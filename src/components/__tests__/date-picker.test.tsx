import { render, userEvent } from '@testing-library/react-native';

import { DatePicker } from '../date-picker';

describe('DatePicker', () => {
  beforeEach(() => {
    // "Today" is 1 Sep 2026, midday so it holds in any timezone.
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 8, 1, 12));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a placeholder and keeps the calendar closed until pressed', async () => {
    const { getByLabelText, queryByText } = await render(
      <DatePicker label="Date" value="" onChange={jest.fn()} />,
    );

    expect(getByLabelText('Date, Choose a date')).toBeTruthy();
    expect(queryByText('September 2026')).toBeNull();
  });

  it('opens on the current month and reports the picked day as YYYY-MM-DD, then closes', async () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText, queryByText } = await render(
      <DatePicker label="Date" value="" onChange={onChange} />,
    );

    await userEvent.press(getByLabelText('Date, Choose a date'));
    expect(getByText('September 2026')).toBeTruthy();

    await userEvent.press(getByLabelText('5 September 2026'));

    expect(onChange).toHaveBeenCalledWith('2026-09-05');
    expect(queryByText('September 2026')).toBeNull();
  });

  it('shows the picked date readably and opens on its month with the day selected', async () => {
    const { getByLabelText, getByText } = await render(
      <DatePicker label="Date" value="2027-02-13" onChange={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Date, Sat 13 Feb 2027'));

    expect(getByText('February 2027')).toBeTruthy();
    expect(getByLabelText('13 February 2027').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(getByLabelText('14 February 2027').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('pages between months, across a year boundary', async () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = await render(
      <DatePicker label="Date" value="2026-12-20" onChange={onChange} />,
    );

    await userEvent.press(getByLabelText('Date, Sun 20 Dec 2026'));
    await userEvent.press(getByLabelText('Next month'));
    expect(getByText('January 2027')).toBeTruthy();

    await userEvent.press(getByLabelText('Previous month'));
    await userEvent.press(getByLabelText('Previous month'));
    expect(getByText('November 2026')).toBeTruthy();

    await userEvent.press(getByLabelText('30 November 2026'));
    expect(onChange).toHaveBeenCalledWith('2026-11-30');
  });

  it('lays out a leap February with the right number of days', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <DatePicker label="Date" value="2028-02-01" onChange={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Date, Tue 1 Feb 2028'));

    expect(getByLabelText('29 February 2028')).toBeTruthy();
    expect(queryByLabelText('30 February 2028')).toBeNull();
  });
});
