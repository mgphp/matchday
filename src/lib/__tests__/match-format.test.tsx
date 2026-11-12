import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DEFAULT_MATCH_FORMAT, defaultDurationFor, useMatchFormat } from '../match-format';

describe('defaultDurationFor', () => {
  it.each([
    [5, 40],
    [6, 40],
    [7, 50],
    [8, 50],
    [9, 60],
    [10, 60],
    [11, 90],
  ])('%i-a-side plays %i minutes', (size, minutes) => {
    expect(defaultDurationFor(size)).toBe(minutes);
  });
});

describe('useMatchFormat', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts at 7-a-side, 50 minutes when nothing is saved', async () => {
    const { result } = await renderHook(() => useMatchFormat('t1'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.format).toEqual(DEFAULT_MATCH_FORMAT);
    expect(DEFAULT_MATCH_FORMAT).toEqual({ teamSize: 7, durationMinutes: 50 });
  });

  it('keeps a separate format per team', async () => {
    await AsyncStorage.setItem(
      'matchday:matchFormat:t2',
      JSON.stringify({ teamSize: 11, durationMinutes: 80 }),
    );

    const { result } = await renderHook(() => useMatchFormat('t2'));
    await waitFor(() => expect(result.current.format.durationMinutes).toBe(80));
    expect(result.current.format.teamSize).toBe(11);
  });

  it('falls back to the default for corrupt or partial data', async () => {
    await AsyncStorage.setItem('matchday:matchFormat:t3', '{not json');
    const { result } = await renderHook(() => useMatchFormat('t3'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.format).toEqual(DEFAULT_MATCH_FORMAT);

    await AsyncStorage.setItem('matchday:matchFormat:t4', JSON.stringify({ teamSize: 9 }));
    const { result: partial } = await renderHook(() => useMatchFormat('t4'));
    await waitFor(() =>
      expect(partial.current.format).toEqual({ teamSize: 9, durationMinutes: 60 }),
    );
  });

  it('resets the length to the new size default, then lets it be overridden', async () => {
    const { result } = await renderHook(() => useMatchFormat('t5'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => result.current.setTeamSize(5));
    expect(result.current.format).toEqual({ teamSize: 5, durationMinutes: 40 });

    await act(async () => result.current.setDurationMinutes(30));
    expect(result.current.format).toEqual({ teamSize: 5, durationMinutes: 30 });
    expect(JSON.parse((await AsyncStorage.getItem('matchday:matchFormat:t5')) ?? '')).toEqual({
      teamSize: 5,
      durationMinutes: 30,
    });
  });
});
