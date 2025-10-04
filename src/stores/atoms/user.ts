import type { User as SupabaseUser } from '@supabase/supabase-js';
import { atom } from 'jotai';

import { mapSupabaseUserToUser } from '@/features/auth/mappers';
import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';
import type { User } from '@/types';

export const userAtom = persistedAtom<Partial<User> | null>(STORAGE_KEYS.USER, null);

// write-only action atom that maps + preserves local-only fields like nickname
export const setUserFromSupabaseAtom = atom(null, async (get, set, su: SupabaseUser | null) => {
  const prev = await get(userAtom);
  const mapped = mapSupabaseUserToUser(su);
  if (!mapped) {
    set(userAtom, null);
    return;
  }

  set(userAtom, {
    ...mapped,
    nickname: prev?.nickname ?? mapped.nickname ?? '',
  } as User);
});
