// src/lib/auth/auth.ts
import { RESET } from 'jotai/utils';

import { queryClient } from '@/services/helper/queryClient';
import { supabase } from '@/services/supabase';
import { authLoadingAtom } from '@/stores/atoms/auth';
import { setUserFromSupabaseAtom, userAtom } from '@/stores/atoms/user';
import { jotaiStore } from '@/stores/store';

const store = jotaiStore; // shared store

// atoms that should be reset on sign out (do NOT include authLoadingAtom if you want loader off after signout)
const atomsToReset = [userAtom] as const;

/** Reset auth-related atoms to their initial state */
function resetAuthState() {
  atomsToReset.forEach((a) => store.set(a, RESET));
  // ensure loader is off after reset
  store.set(authLoadingAtom, false);
}

export async function initAuth() {
  // mark loading when initialising
  store.set(authLoadingAtom, true);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Use the action atom — it will map and preserve local fields like nickname
    store.set(setUserFromSupabaseAtom, session?.user ?? null);
  } catch (err) {
    console.warn('Auth init error', err);
  } finally {
    store.set(authLoadingAtom, false);
    queryClient.clear();
  }

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    store.set(setUserFromSupabaseAtom, session?.user ?? null);

    if (!_event || _event === 'SIGNED_OUT') {
      resetAuthState();
      queryClient.clear();
    }
  });

  const unsubscribe = () => {
    try {
      listener?.subscription?.unsubscribe?.();
    } catch {
      console.error('Error occured on unsubscribe');
    }
  };

  return unsubscribe;
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('signOut error', err);
  } finally {
    resetAuthState();
    queryClient.clear();
  }
}
