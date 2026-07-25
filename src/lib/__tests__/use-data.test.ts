import { renderHook, waitFor } from '@testing-library/react-native';

import { useData } from '../use-data';

describe('useData', () => {
  it('resolves to success with the fetched data', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 'hello' });
    const { result } = await renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ value: 'hello' });
  });

  it('resolves to an error state when the fetcher rejects', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network down'));
    const { result } = await renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('network down');
  });

  it('wraps a non-Error rejection in an Error', async () => {
    const fetcher = jest.fn().mockRejectedValue('boom');
    const { result } = await renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('boom');
  });

  it('reload() refetches and reflects the new data', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce({ value: 1 }).mockResolvedValueOnce({
      value: 2,
    });
    const { result } = await renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    result.current.reload();

    await waitFor(() => expect(result.current.data).toEqual({ value: 2 }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refresh() refetches and updates the data without leaving isRefreshing stuck', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce({ value: 1 }).mockResolvedValueOnce({
      value: 2,
    });
    const { result } = await renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    await result.current.refresh();

    await waitFor(() => expect(result.current.data).toEqual({ value: 2 }));
    expect(result.current.isRefreshing).toBe(false);
  });

  it('refresh() surfaces an error without throwing', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockRejectedValueOnce(new Error('refresh failed'));
    const { result } = await renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    await result.current.refresh();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('refresh failed');
    expect(result.current.isRefreshing).toBe(false);
  });
});
