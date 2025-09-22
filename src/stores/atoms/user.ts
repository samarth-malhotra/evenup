import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';
import type { User } from '@/types';

export const userAtom = persistedAtom<User | null>(STORAGE_KEYS.USER, null);
