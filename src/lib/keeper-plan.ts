import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const keeperKey = (matchId: string) => `matchday:secondKeeper:${matchId}`;

/**
 * The second-half goalkeeper chosen for a match, kept on this phone only.
 * `undefined` means the keeper plays the full match.
 */
export function useSecondKeeper(matchId: string) {
  const [secondKeeperId, setState] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(keeperKey(matchId))
      .then((value) => {
        if (!cancelled) setState(value ?? undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const setSecondKeeperId = useCallback(
    (id: string | undefined) => {
      setState(id);
      const write = id
        ? AsyncStorage.setItem(keeperKey(matchId), id)
        : AsyncStorage.removeItem(keeperKey(matchId));
      write.catch(() => undefined);
    },
    [matchId],
  );

  return { secondKeeperId, setSecondKeeperId };
}
