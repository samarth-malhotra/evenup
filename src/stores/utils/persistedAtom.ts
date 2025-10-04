// src/store/utils/persistedAtom.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom } from 'jotai';
import { RESET } from 'jotai/utils';

type PersistedAtomOptions = {
  // whether to read storage on atom creation (default true). If false, the atom will keep initialValue
  // until some code triggers load by calling `loadPersisted()` (rarely needed).
  loadOnInit?: boolean;
};

/**
 * persistedAtom: returns a synchronous atom that mirrors AsyncStorage.
 *
 * - Consumers read/write the returned atom synchronously (no Promise types).
 * - On mount, the atom will attempt to load the persisted value and set atom state.
 * - Writes update the in-memory atom immediately and persist to AsyncStorage asynchronously.
 * - Calling store.set(atom, RESET) will clear both in-memory and AsyncStorage.
 *
 * Usage:
 *  const userAtom = persistedAtom<User | null>('evenup:user', null);
 */
export function persistedAtom<T>(
  key: string,
  initialValue: T,
  options: PersistedAtomOptions = { loadOnInit: true }
) {
  const baseAtom = atom<T>(initialValue);

  // onMount: load stored value once (if any) and set baseAtom.
  // Jotai supports setting `onMount` by assigning a function to the atom object.
  // Type-wise this is allowed; we give the setter a cleanup return.
  (baseAtom as any).onMount = (setAtom: (v: T) => void) => {
    let cancelled = false;

    async function load() {
      if (!options.loadOnInit) return;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (raw != null) {
          const parsed = JSON.parse(raw) as T;
          setAtom(parsed);
        }
      } catch (e) {
        // keep initial value on error

        console.warn(`[persistedAtom] load error for key "${key}"`, e);
      }
    }

    load();

    // cleanup
    return () => {
      cancelled = true;
    };
  };

  // writable derived atom: updates both in-memory and AsyncStorage.
  const syncedAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: T | ((prev: T) => T) | typeof RESET) => {
      // compute new in-memory value synchronously
      if (update === RESET) {
        set(baseAtom, initialValue);
        // async remove from storage
        (async () => {
          try {
            await AsyncStorage.removeItem(key);
          } catch (e) {
            console.warn(`[persistedAtom] removeItem error for key "${key}"`, e);
          }
        })();

        return;
      }

      const prev = get(baseAtom);
      const next = typeof update === 'function' ? (update as (p: T) => T)(prev) : update;
      set(baseAtom, next);

      // async persist, fire-and-forget
      (async () => {
        try {
          await AsyncStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
          console.warn(`[persistedAtom] setItem error for key "${key}"`, e);
        }
      })();
    }
  );

  return syncedAtom;
}
