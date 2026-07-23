import { render, userEvent } from '@testing-library/react-native';

import { ErrorBoundary } from '@/app/_layout';

describe('RootLayout ErrorBoundary', () => {
  it('shows the error message and retries on demand', async () => {
    const retry = jest.fn();
    const { findByText, getByRole } = await render(
      <ErrorBoundary error={new Error('Boom')} retry={retry} />,
    );

    expect(await findByText('Boom')).toBeTruthy();

    await userEvent.press(getByRole('button'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message when the error has none', async () => {
    const { findByText } = await render(<ErrorBoundary error={new Error()} retry={jest.fn()} />);

    expect(await findByText('Something went wrong.')).toBeTruthy();
  });
});
