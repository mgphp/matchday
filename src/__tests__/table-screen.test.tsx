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
});
