import { atom } from 'jotai';

import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';

export const authLoadingAtom = atom<boolean>(false);
export const themeAtom = persistedAtom(STORAGE_KEYS.THEME_PREFERENCE, 'system');
