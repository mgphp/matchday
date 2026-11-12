import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** The small-sided formats a coach picks from (players per side, keeper included). */
export const FORMAT_SIZES = [5, 7, 9, 11] as const;

export interface MatchFormat {
  /** Players per side, keeper included. */
  teamSize: number;
  /** Full-time length in minutes for a match that doesn't set its own. */
  durationMinutes: number;
}

/**
 * A sensible full-time length for a team size, following the FA's
 * grassroots formats: 5v5 ≈ 40', 7v7 ≈ 50', 9v9 ≈ 60', 11v11 a full 90'.
 * Sizes between formats take the smaller format's length.
 */
export function defaultDurationFor(teamSize: number): number {
  if (teamSize >= 11) return 90;
  if (teamSize >= 9) return 60;
  if (teamSize >= 7) return 50;
  return 40;
}

/** Until a coach sets one: 7-a-side, the app's most common format. */
export const DEFAULT_MATCH_FORMAT: MatchFormat = {
  teamSize: 7,
  durationMinutes: defaultDurationFor(7),
};

const storageKey = (teamId: string) => `matchday:matchFormat:${teamId}`;

function parse(value: string | null): MatchFormat {
  if (!value) return DEFAULT_MATCH_FORMAT;
  try {
    const parsed = JSON.parse(value) as Partial<MatchFormat>;
    const teamSize = Number.isInteger(parsed.teamSize)
      ? (parsed.teamSize as number)
      : DEFAULT_MATCH_FORMAT.teamSize;
    const durationMinutes =
      Number.isInteger(parsed.durationMinutes) && (parsed.durationMinutes as number) > 0
        ? (parsed.durationMinutes as number)
        : defaultDurationFor(teamSize);
    return { teamSize, durationMinutes };
  } catch {
    return DEFAULT_MATCH_FORMAT;
  }
}

/**
 * The team's match format, persisted on-device per team (AsyncStorage). New
 * fixtures and any match without its own `durationMinutes` use this length;
 * Edit match still overrides it per match.
 */
export function useMatchFormat(teamId: string) {
  const [format, setFormat] = useState<MatchFormat>(DEFAULT_MATCH_FORMAT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey(teamId)).then((value) => {
      if (!cancelled) {
        setFormat(parse(value));
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const save = useCallback(
    (next: MatchFormat) => {
      setFormat(next);
      void AsyncStorage.setItem(storageKey(teamId), JSON.stringify(next));
    },
    [teamId],
  );

  /** Changing the size resets the length to that format's default. */
  const setTeamSize = useCallback(
    (teamSize: number) => save({ teamSize, durationMinutes: defaultDurationFor(teamSize) }),
    [save],
  );

  const setDurationMinutes = useCallback(
    (durationMinutes: number) => save({ ...format, durationMinutes }),
    [format, save],
  );

  return { format, isLoaded, setTeamSize, setDurationMinutes };
}
