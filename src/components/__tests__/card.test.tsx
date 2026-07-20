import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { colors } from '@/theme/theme';

import { Card } from '../card';

describe('Card', () => {
  it('renders children on a raised surface', async () => {
    const { getByTestId, getByText } = await render(
      <Card testID="card">
        <Text>Fixture</Text>
      </Card>,
    );
    expect(getByText('Fixture')).toBeTruthy();
    expect(getByTestId('card')).toHaveStyle({ backgroundColor: colors.surface });
  });
});
