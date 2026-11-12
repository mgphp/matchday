import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSecondKeeper } from '../keeper-plan';

describe('useSecondKeeper', () => {
  afterEach(() => AsyncStorage.clear());

  it('loads the saved second-half keeper for the match', async () => {
    await AsyncStorage.setItem('matchday:secondKeeper:m1', 'p7');
    const { result } = await renderHook(() => useSecondKeeper('m1'));

    await waitFor(() => expect(result.current.secondKeeperId).toBe('p7'));
  });

  it('saves a choice and forgets it when the keeper plays the full match', async () => {
    const { result } = await renderHook(() => useSecondKeeper('m1'));

    await act(async () => result.current.setSecondKeeperId('p3'));
    expect(await AsyncStorage.getItem('matchday:secondKeeper:m1')).toBe('p3');

    await act(async () => result.current.setSecondKeeperId(undefined));
    expect(result.current.secondKeeperId).toBeUndefined();
    expect(await AsyncStorage.getItem('matchday:secondKeeper:m1')).toBeNull();
  });
});
