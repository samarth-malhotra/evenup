// lib/auth/AuthProvider.tsx
import { userAtom } from '@/stores/atoms/user';
import { supabase } from '@/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { useSetAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
// import { userAtom, authLoadingAtom } from '@/lib/state/authAtoms';

const AuthContext = createContext(
  {} as {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
  }
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // include all the atoms here which needs to be reset on singout
  const authAtoms = [userAtom] as const;
  const resetFns = [useResetAtom(authAtoms[0])];
  const setUser = useSetAtom(userAtom);

  const [user, setLocalUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetAll = useCallback(() => {
    resetFns.forEach((fn) => fn());
    setLocalUser(null);
    setSession(null);
  }, [resetFns]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();

        if (!mounted) return;
        setSession(s ?? null);
        setLocalUser(s?.user ?? null);

        // write to Jotai
        setUser(s?.user ?? null);
      } catch (err) {
        console.warn('Auth init error', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      // update local state
      setSession(s ?? null);
      setLocalUser(s?.user ?? null);

      // update atoms
      setUser(s?.user ?? null);

      // you can also clear other auth-related atoms on signed out:
      if (!_event || _event === 'SIGNED_OUT') {
        // reset other atoms if needed
        resetAll();
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [setUser]);

  async function signOut() {
    await supabase.auth.signOut();
    resetAll();
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
