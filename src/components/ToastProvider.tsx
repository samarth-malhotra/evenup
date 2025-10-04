// providers/ToastProvider.tsx
import { useAtom, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
// import type { ToastType } from 'react-native-toast-message';
import Toast from 'react-native-toast-message';

import type { TToast } from '@/stores/atoms/toast';
import {
  addToastAtom,
  DEFAULT_TOAST_DURATION,
  removeToastAtom,
  toastsAtom,
} from '@/stores/atoms/toast';

export default function ToastProvider() {
  const [toasts] = useAtom(toastsAtom);
  const addToast = useSetAtom(addToastAtom);
  const removeToast = useSetAtom(removeToastAtom);

  // track which toast ids we've already shown
  const shownRef = useRef<Set<string>>(new Set());

  // expose global imperative function so showToast() can work anywhere
  useEffect(() => {
    (global as any).__evenup_show_toast = (toast: TToast) => {
      addToast(toast);
    };
    return () => {
      // cleanup
      try {
        delete (global as any).__evenup_show_toast;
      } catch {
        (global as any).__evenup_show_toast = undefined;
      }
    };
  }, [addToast]);

  // whenever toasts update, show new ones
  useEffect(() => {
    for (const t of toasts) {
      if (!t.id) continue;
      if (shownRef.current.has(t.id)) continue;

      shownRef.current.add(t.id);

      // show using react-native-toast-message
      Toast.show({
        type: t.type ?? 'success',
        text1: t.title,
        text2: t.message,
        visibilityTime: t.duration ?? DEFAULT_TOAST_DURATION,
        onHide: () => {
          // remove from atom after hide
          removeToast(t.id);
          shownRef.current.delete(t.id);
        },
      });

      // As a fallback, ensure removal even if onHide doesn't fire
      const duration = t.duration ?? DEFAULT_TOAST_DURATION;
      setTimeout(() => {
        if (shownRef.current.has(t.id)) {
          removeToast(t.id);
          shownRef.current.delete(t.id);
        }
      }, duration + 500);
    }
  }, [toasts, removeToast]);

  return <Toast />;
}
