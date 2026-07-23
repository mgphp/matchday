import { render } from '@testing-library/react-native';

import { colors } from '@/theme/theme';

import { SectionHeader } from '../section-header';

describe('SectionHeader', () => {
  it('renders its title', async () => {
    const { getByText } = await render(<SectionHeader title="Goalkeepers" />);
    expect(getByText('Goalkeepers')).toBeTruthy();
  });

  it('uses the muted secondary color for the default variant', async () => {
    const { getByText } = await render(<SectionHeader title="Goalkeepers" />);
    expect(getByText('Goalkeepers')).toHaveStyle({ color: colors.textSecondary });
  });

  it('uses the accent color for the accent variant', async () => {
    const { getByText } = await render(<SectionHeader title="Events" variant="accent" />);
    expect(getByText('Events')).toHaveStyle({ color: colors.accent });
  });
});
