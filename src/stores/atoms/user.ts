import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';
import type { User as EvenUpUser } from '@/types';

export const userAtom = persistedAtom<EvenUpUser | null>(STORAGE_KEYS.USER, null);
