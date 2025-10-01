// atoms/toast.ts
import { atom } from 'jotai';

import type { TOAST_TYPE } from '@/constant';

export type Toast = {
  id?: string;
  title?: string;
  message: string;
  type?: `${TOAST_TYPE}`;
  duration?: number;
};

export const toastsAtom = atom<Toast[]>([]);

export const addToastAtom = atom(null, (get, set, toast: Toast) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const current = get(toastsAtom);
  set(toastsAtom, [...current, { ...toast, id }]);
});

export const removeToastAtom = atom(null, (get, set, id?: string) => {
  if (!id) return;
  set(
    toastsAtom,
    get(toastsAtom).filter((t) => t.id !== id)
  );
});

// utility used by our wrapper to fire toasts (imperative)
export const showToast = (toast: Toast) => {
  // import the write method lazily so wrapper can call it without React component
  // Note: this pattern requires a small helper where you expose an imperative setter.
  // simplest approach: call a window-level function set by your AppProvider (example below)
  (global as any).__evenup_show_toast?.(toast);
};
