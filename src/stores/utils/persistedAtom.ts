// src/store/utils/persistedAtom.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atomWithStorage } from 'jotai/utils';

function createAsyncStorage<T>(defaultValue: T) {
  return {
    // NOTE: returns Promise<T> (never Promise<T | null>) — maps missing -> defaultValue
    getItem: async (key: string): Promise<T> => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw == null) return defaultValue;
        return JSON.parse(raw) as T;
      } catch (e) {
        console.warn(`[persistedAtom] getItem parse error for key "${key}"`, e);
        return defaultValue;
      }
    },
    setItem: async (key: string, value: T) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn(`[persistedAtom] setItem error for key "${key}"`, e);
      }
    },
    removeItem: async (key: string) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn(`[persistedAtom] removeItem error for key "${key}"`, e);
      }
    },
  };
}

/**
 * persistedAtom: shorthand for atomWithStorage + RN AsyncStorage JSON adapter
 *
 * Usage:
 *  const userAtom = persistedAtom<User | null>('evenup:user', null);
 *
 * Notes:
 *  - initialValue is used as the default when AsyncStorage has no value.
 *  - If you pass `initialValue = null`, then T can be `User | null` and the storage
 *    adapter returns Promise<User | null> (which matches atomWithStorage<T>).
 */
export function persistedAtom<T>(key: string, initialValue: T, options?: { getOnInit?: boolean }) {
  return atomWithStorage<T>(key, initialValue, createAsyncStorage<T>(initialValue), options);
}
