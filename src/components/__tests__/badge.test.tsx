import { render } from '@testing-library/react-native';

import { colors } from '@/theme/theme';

import { Badge } from '../badge';

describe('Badge', () => {
  it('renders its label', async () => {
    const { getByText } = await render(<Badge label="Today 17:30" />);
    expect(getByText('Today 17:30')).toBeTruthy();
  });

  it('uses the amber alert color for the live variant', async () => {
    const { getByTestId } = await render(<Badge label="LIVE" variant="live" testID="badge" />);
    expect(getByTestId('badge')).toHaveStyle({ backgroundColor: colors.alert });
  });

  it('uses the muted amber background for the alert variant', async () => {
    const { getByTestId } = await render(
      <Badge label="Postponed" variant="alert" testID="badge" />,
    );
    expect(getByTestId('badge')).toHaveStyle({ backgroundColor: colors.alertMuted });
  });
});
