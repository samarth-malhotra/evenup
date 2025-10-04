// atoms/toast.ts
import { atom } from 'jotai';

import type { TOAST_TYPE } from '@/constant';

export type TToast = {
  id: string;
  title?: string;
  message: string;
  type?: `${TOAST_TYPE}`;
  duration?: number;
};

export const DEFAULT_TOAST_DURATION = 3000;
// Input type when adding a new toast (no id yet)
export type NewToast = Omit<TToast, 'id'>;

export const toastsAtom = atom<TToast[]>([]);

export const addToastAtom = atom(null, (get, set, toast: NewToast) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const current = get(toastsAtom);
  set(toastsAtom, [...current, { ...toast, id }]);
});

export const removeToastAtom = atom(null, (get, set, id: string) => {
  set(
    toastsAtom,
    get(toastsAtom).filter((t) => t.id !== id)
  );
});

// imperative helper
export const showToast = (toast: NewToast) => {
  (global as any).__evenup_show_toast?.(toast);
};
