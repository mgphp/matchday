import { useCallback, useEffect, useState } from 'react';

type DataState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error }
  | { status: 'success'; data: T; error?: undefined };

/** Minimal async data hook: loading / error / success plus manual reload. */
export function useData<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<DataState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  /** Refetch without discarding current data (pull-to-refresh, polling). */
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    return fetcher()
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) =>
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
      )
      .finally(() => setIsRefreshing(false));
  }, [fetcher]);

  return { ...state, reload, refresh, isRefreshing };
}
