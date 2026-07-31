import { useEffect, useState } from 'react';

/**
 * Current wall-clock time, re-read on an interval while `active`.
 *
 * Lets a derived clock tick smoothly between network refreshes without
 * storing the minute in state.
 */
export function useNow(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    // Deliberately no synchronous read here: the first tick refreshes it, so
    // becoming active is at most one interval stale — and callers only use
    // this value while something is actively counting.
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, active]);

  return now;
}
