import { renderHook, waitFor } from '@testing-library/react-native';

import { useNow } from '@/lib/use-now';

// Real timers with a short interval: faking timers here fights React's act()
// queue, and the hook's whole job is to re-read the real wall clock.
const TICK_MS = 20;

describe('useNow', () => {
  it('advances on the interval while active', async () => {
    const { result } = await renderHook(() => useNow(TICK_MS, true));
    const first = result.current;

    await waitFor(() => expect(result.current).toBeGreaterThan(first));
  });

  it('stays put while inactive', async () => {
    const { result } = await renderHook(() => useNow(TICK_MS, false));
    const first = result.current;

    await new Promise((resolve) => setTimeout(resolve, TICK_MS * 5));

    expect(result.current).toBe(first);
  });

  it('stops ticking once unmounted', async () => {
    const { result, unmount } = await renderHook(() => useNow(TICK_MS, true));
    await waitFor(() => expect(result.current).toBeGreaterThan(0));

    unmount();
    const afterUnmount = result.current;
    await new Promise((resolve) => setTimeout(resolve, TICK_MS * 5));

    expect(result.current).toBe(afterUnmount);
  });
});
