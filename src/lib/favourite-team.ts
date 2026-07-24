import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'matchday:favouriteTeamId';

/** Persisted favourite team id (null = none set), backed by AsyncStorage. */
export function useFavouriteTeam() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!cancelled) {
        setTeamId(value);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setFavouriteTeam = useCallback((id: string | null) => {
    setTeamId(id);
    if (id === null) {
      void AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      void AsyncStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  return { teamId, isLoaded, setFavouriteTeam };
}
