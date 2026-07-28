import { render } from '@testing-library/react-native';

import TableScreen from '@/app/(tabs)/table';
import { colors } from '@/theme/theme';

describe('TableScreen', () => {
  it('highlights the promotion zone with the teal accent', async () => {
    const { findByTestId } = await render(<TableScreen />);

    const row = await findByTestId('standing-row-rovers');
    expect(row.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderLeftColor: colors.accent })]),
    );
  });

  it('highlights the relegation zone with the amber alert color', async () => {
    const { findByTestId } = await render(<TableScreen />);

    const row = await findByTestId('standing-row-county');
    expect(row.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderLeftColor: colors.alert })]),
    );
  });

  it('does not highlight mid-table teams', async () => {
    const { findByTestId } = await render(<TableScreen />);

    const row = await findByTestId('standing-row-athletic');
    expect(row.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderLeftColor: 'transparent' })]),
    );
  });

  it('gives promotion zone rows a descriptive label naming the zone', async () => {
    const { findByTestId } = await render(<TableScreen />);

    const row = await findByTestId('standing-row-rovers');
    expect(row.props.accessibilityLabel).toBe(
      '1st, Northgate Rovers, played 4, goal difference 7, 10 points, promotion zone',
    );
  });

  it('gives relegation zone rows a descriptive label naming the zone', async () => {
    const { findByTestId } = await render(<TableScreen />);

    const row = await findByTestId('standing-row-county');
    expect(row.props.accessibilityLabel).toBe(
      '6th, Redbrook County, played 4, goal difference -10, 0 points, relegation zone',
    );
  });

  it('omits the zone from mid-table rows', async () => {
    const { findByTestId } = await render(<TableScreen />);

    const row = await findByTestId('standing-row-athletic');
    expect(row.props.accessibilityLabel).toBe(
      '3rd, Kings Athletic, played 4, goal difference 2, 7 points',
    );
  });
});
