import { render } from '@testing-library/react-native';

import { SkeletonCard } from '../skeleton-card';

describe('SkeletonCard', () => {
  it('renders a labeled loading placeholder', async () => {
    const { getByLabelText } = await render(<SkeletonCard />);
    expect(getByLabelText('Loading fixture')).toBeTruthy();
  });
});
