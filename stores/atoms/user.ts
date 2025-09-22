import type { User } from '@/types';
import { STORAGE_KEYS } from '../storageKeys';
import { persistedAtom } from '../utils/persistedAtom';

export const userAtom = persistedAtom<User | null>(STORAGE_KEYS.USER, null);
