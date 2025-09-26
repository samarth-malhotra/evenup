import type { User } from '@supabase/supabase-js';
import { atom } from 'jotai';

import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';

export const userAtom = persistedAtom<User | null>(STORAGE_KEYS.USER, null);
// derived boolean
export const isAuthenticatedAtom = atom((get) => !!get(userAtom));
