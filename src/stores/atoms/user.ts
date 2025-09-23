import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';
import { User } from '@supabase/supabase-js';
import { atom } from 'jotai';
// import type { User } from '@/types';

const defaultUserValue = {
  id: '',
  email: '',
  name: '',
  avatarUrl: '',
  phone: '',
  createdAt: '',
};
export const userAtom = persistedAtom<User | null>(STORAGE_KEYS.USER, null);
// derived boolean
export const isAuthenticatedAtom = atom((get) => !!get(userAtom));

export const authLoadingAtom = atom(false);
