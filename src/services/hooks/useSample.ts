// src/lib/useUserProfileReference.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useOptimisticMutation } from '@/services/helper/optimisticMutation';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { supabase } from '@/services/supabase/supabase';
import type { User } from '@/types';

/**
 * Types
 */
export type UserProfile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  updated_at?: string | null;
};

/** Variables we pass to update */
export type UpdateProfileVars = {
  id: string;
  patch: Partial<Omit<UserProfile, 'id' | 'updated_at'>>;
};

export type UpdateProfileResult = UserProfile | null;

/**
 * Query keys helper
 * - Use consistent queryKey shape across read + optimistic update hooks so wrapper can
 *   correctly setQueryData / rollback.
 */
export const userProfileQueryKey = (id: string | null | undefined) => ['user', id];

/**
 * FETCHER: read a single user profile from supabase
 * - maybeSingle()/select() used so we can get "server row" when necessary (Option B).
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from<User>('profiles')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * READ HOOK: useUserProfile
 * - standard react-query read hook. Tune staleTime/cacheTime per app needs.
 */
export function useUserProfile(userId?: string | null) {
  return useQuery({
    queryKey: userProfileQueryKey(userId ?? 'me'),
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      return await fetchUserProfile(userId);
    },
    // Recommended defaults:
    // - staleTime: 0 means always considered stale — good if you want frequent revalidation.
    // - but for optimistic-first UX you might increase staleTime to reduce background refetches.
    staleTime: 0,
    gcTime: 1000 * 60 * 5, // 5 mins
  });
}

/* -------------------------------------------------------------------------- */
/*  THREE MUTATION STRATEGIES (Option A / B / C)                               */
/*  - Option A: keep optimistic patch local; NO refetch on success             */
/*  - Option B: server returns updated row -> write that authoritative row     */
/*  - Option C: always refetch on success (invalidate) for absolute correctness*/
/* -------------------------------------------------------------------------- */

/* --------------------------- Option A: Local-only -------------------------- */
/**
 * Description:
 * - You already have the new data locally (the patch), you don't need an immediate
 *   authoritative server copy, so you keep the optimistic merged value in cache
 *   and do NOT trigger revalidation on success.
 *
 * Expected behavior:
 * - Fastest UX, minimal network. If server does any transforms you'll see them later
 *   when cache revalidates/expiry occurs.
 */
export function useUpdateUserProfile_LocalOnly() {
  const qc = useQueryClient();

  return useOptimisticMutation<
    UpdateProfileResult,
    UpdateProfileVars,
    { previous?: Map<string, any> }
  >({
    // mutationFn sends update to server; may return server row or null
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        // we intentionally don't call .select() here — server may or may not return row based on your supabase config.
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },

    // target query key used for optimistic set/rollback.
    // This can be a QueryKey or a function that returns one.
    targetQueryKey: QUERY_KEYS.profile.me,

    // optimisticUpdate merges patch into previous cached profile (pure function)
    optimisticUpdate: ({ previous, variables }) => {
      const prev = previous as UserProfile | null | undefined;
      const now = new Date().toISOString();
      if (!prev) {
        // no cached value -> create minimal optimistic object
        return { id: variables.id, ...variables.patch, updated_at: now } as UserProfile;
      }
      // return a pure merged object
      return { ...prev, ...variables.patch, updated_at: now } as UserProfile;
    },

    // IMPORTANT: do not invalidate any keys onSettled -- leave optimistic value in cache
    invalidateQueryKeys: [],

    buildContext: ({ previous }) => ({ previous }),

    // replaceOnSuccess uses server data if provided, otherwise writes a merged local object
    replaceOnSuccess: ({ data, variables, qc }) => {
      const key = userProfileQueryKey(variables.id);
      if (data) {
        // server returned authoritative row — use it
        qc.setQueryData(key, data);
        return;
      }
      // server didn't return row; write the local merged value (keep optimistic)
      const current = qc.getQueryData<UserProfile | null>(key) ?? null;
      const now = new Date().toISOString();
      const merged = {
        ...(current ?? { id: variables.id }),
        ...variables.patch,
        updated_at: now,
      } as UserProfile;
      qc.setQueryData(key, merged);
    },

    // If your app has special auth error handling, pass onAuthError / throwOnAuthError
    // onAuthError: () => signOutUser(),
  });
}

/* ---------------------- Option B: Server-returns-row (recommended) ---------- */
/**
 * Description:
 * - Ask Supabase to return the updated row in the same request (single round trip).
 * - On success, write that authoritative server row into cache with replaceOnSuccess.
 *
 * Why choose this:
 * - Single network roundtrip gives you the server-canonical row without a second fetch.
 * - Safer than Option A for servers that transform or compute fields (e.g., updated_at, computed flags).
 */
export function useUpdateUserProfile_WithServerRow() {
  const qc = useQueryClient();

  return useOptimisticMutation<
    UpdateProfileResult,
    UpdateProfileVars,
    { previous?: Map<string, any> }
  >({
    mutationFn: async ({ id, patch }) => {
      // Note: .select('*') after update asks supabase to return the updated row.
      const { data, error } = await supabase
        .from<UserProfile>('profiles')
        .update({ ...patch })
        .eq('id', id)
        .select('*')
        .maybeSingle(); // returns the updated row if available

      if (error) throw error;
      return data ?? null;
    },

    targetQueryKey: QUERY_KEYS.profile.me,

    optimisticUpdate: ({ previous, variables }) => {
      // same merging behavior for immediate optimistic UI
      const prev = previous as UserProfile | null | undefined;
      const now = new Date().toISOString();
      if (!prev) return { id: variables.id, ...variables.patch, updated_at: now } as UserProfile;
      return { ...prev, ...variables.patch, updated_at: now } as UserProfile;
    },

    // No invalidation necessary — we'll write server row to cache in replaceOnSuccess
    invalidateQueryKeys: [],

    buildContext: ({ previous }) => ({ previous }),

    replaceOnSuccess: ({ data, variables, qc }) => {
      const key = userProfileQueryKey(variables.id);
      if (data) {
        // authoritative server row available -> write it (no refetch)
        qc.setQueryData(key, data);
      } else {
        // fallback to merged local result (should not commonly happen if server returns row)
        const current = qc.getQueryData<UserProfile | null>(key) ?? null;
        const now = new Date().toISOString();
        qc.setQueryData(key, {
          ...(current ?? { id: variables.id }),
          ...variables.patch,
          updated_at: now,
        });
      }
    },
  });
}

/* --------------------------- Option C: Strict refetch ----------------------- */
/**
 * Description:
 * - After mutation, invalidate or refetch the queryKey to guarantee server truth.
 * - Use when server may compute derived fields you must show immediately OR when
 *   concurrent writers are likely and you need the absolute latest.
 *
 * Tradeoff:
 * - Extra network request and slightly slower final state, but guarantees correctness.
 */
export function useUpdateUserProfile_Refetch() {
  const qc = useQueryClient();

  return useOptimisticMutation<
    UpdateProfileResult,
    UpdateProfileVars,
    { previous?: Map<string, any> }
  >({
    mutationFn: async ({ id, patch }) => {
      // Update server. You may or may not request the row back here; for Option C we don't rely on it.
      const { data, error } = await supabase
        .from<UserProfile>('profiles')
        .update({ ...patch })
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },

    targetQueryKey: QUERY_KEYS.profile.me,

    optimisticUpdate: ({ previous, variables }) => {
      // same optimistic merge for instant UI
      const prev = previous as UserProfile | null | undefined;
      const now = new Date().toISOString();
      if (!prev) return { id: variables.id, ...variables.patch, updated_at: now } as UserProfile;
      return { ...prev, ...variables.patch, updated_at: now } as UserProfile;
    },

    // Invalidate the profile query so react-query will refetch authoritative copy onSettled
    invalidateQueryKeys: (vars: UpdateProfileVars) => [userProfileQueryKey(vars.id)],

    buildContext: ({ previous }) => ({ previous }),

    // replaceOnSuccess can still write the server data if mutation returned it; otherwise let the invalidation refetch.
    replaceOnSuccess: ({ data, variables, qc }) => {
      const key = userProfileQueryKey(variables.id);
      if (data) qc.setQueryData(key, data);
      // else do nothing — the invalidation will trigger a refetch and fill cache.
    },
  });
}

/* ------------------------------ Extra example ------------------------------ */
/**
 * Example: optimistic update for a LIST of users (e.g., ['users'] queryKey)
 * - Show how to update a cached array (find+replace) optimistically.
 */
export function useUpdateUserInList() {
  const qc = useQueryClient();

  return useOptimisticMutation<UserProfile, UpdateProfileVars, { previous?: Map<string, any> }>({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from<UserProfile>('profiles')
        .update({ ...patch })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },

    // target a list query key (e.g., ['users'])
    targetQueryKey: (vars: UpdateProfileVars) => ['users'],

    optimisticUpdate: ({ previous, variables }) => {
      // previous is expected to be UserProfile[] | undefined
      const prevList = (previous as UserProfile[] | undefined) ?? [];
      const updated = prevList.map((u) =>
        u.id === variables.id ? { ...u, ...variables.patch } : u
      );
      // If user wasn't in list, optionally append — here we just return mapped list
      return updated;
    },

    invalidateQueryKeys: [],

    replaceOnSuccess: ({ data, variables, qc }) => {
      // Set authoritative result into the list if server returned row
      if (!data) return;
      const key = ['users'];
      qc.setQueryData<UserProfile[] | undefined>(key, (prev) => {
        if (!prev) return [data];
        return prev.map((u) => (u.id === data.id ? data : u));
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Minimal UI Example to demonstrate usage of the three variants              */
/* -------------------------------------------------------------------------- */

export function ProfileEditorDemo({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useUserProfile(userId);

  // Choose whichever mutation type you want to demo
  const updateLocalOnly = useUpdateUserProfile_LocalOnly();
  const updateServerRow = useUpdateUserProfile_WithServerRow();
  const updateRefetch = useUpdateUserProfile_Refetch();

  // local controlled state for form
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(profile?.full_name ?? '');
  const [bio, setBio] = React.useState(profile?.bio ?? '');

  React.useEffect(() => {
    setName(profile?.full_name ?? '');
    setBio(profile?.bio ?? '');
  }, [profile?.full_name, profile?.bio]);

  if (isLoading) return 'loading';

  // helper to call any mutate (common UX pattern)
  async function runUpdate(mutationHook: ReturnType<typeof useUpdateUserProfile_LocalOnly> | any) {
    const vars: UpdateProfileVars = { id: userId, patch: { full_name: name, bio } };
    // disable editing immediately for optimistic UX
    setEditing(false);

    try {
      // mutateAsync returns a promise; on success your replaceOnSuccess will write cache appropriately
      await mutationHook.mutateAsync(vars);
      // optionally show toast: 'Saved'
      // NOTE: no further refetch needed for Option A/B (we already wrote into cache)
    } catch (err) {
      // wrapper already rolled back cache to snapshot in onError; just log + show UI feedback
      console.error('Update failed', err);
      // optionally refetch to ensure canonical state:
      qc.invalidateQueries({ queryKey: userProfileQueryKey(userId) });
      // restore form from cache (rollback applied)
      const current = qc.getQueryData<UserProfile | null>(userProfileQueryKey(userId));
      setName(current?.full_name ?? '');
      setBio(current?.bio ?? '');
      // show toast: 'Save failed'
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  QUICK DECISION CHEAT-SHEET (short)                                        */
/* -------------------------------------------------------------------------- */
/**
 * - If server returns the updated row in the same request -> prefer Option B.
 * - If you already have all fields you're happy with and want minimal network -> Option A.
 * - If you need absolute correctness right away (derived/aggregated fields or many writers) -> Option C.
 *
 * React-query tuning:
 * - If using Option A, increase staleTime (30s–5m) to avoid immediate background revalidation.
 * - If using Option B, keep staleTime small or default — you have canonical row immediately.
 * - Use cacheTime to control how long unused caches remain.
 *
 * Error handling:
 * - Your wrapper rolls back automatically onError; in component catch, console.error and show toast to user.
 * - Consider onAuthError in wrapper to funnel auth-specific flows (logout, refresh token, etc).
 */

/**
 * Short explanation of key fields/options in useOptimisticMutation (mapping to above)

targetQueryKey: the query key(s) to update optimistically and rollback if needed. Can be a function of variables (recommended).
optimisticUpdate: pure function that receives { previous, variables, now } and returns the optimistic value to set in cache.
replaceOnSuccess: when server returns data, a hook to write authoritative data into cache (no re-fetch).
invalidateQueryKeys: which keys to invalidate when the mutation settles — used for Option C to force refetch.
extraOnMutate: run side-effects during onMutate (ex: adjust counters, update other caches).
buildContext: additional context for onError/onSettled (you may store snapshots here).
onAuthError / throwOnAuthError: hooks for PostgREST auth errors (see your wrapper).

* Final recommendations
Prefer Option B when your DB/API can return the updated row (.update(...).select('*')) — gives server-correct data in one roundtrip.
Use Option A when you own the data and the server won't change it — fastest UX and minimal network. Increase staleTime so you don't immediately revalidate.
Use Option C when you must be correct immediately (derived fields, concurrent writers).
Always console.error in the component catch for visibility; rely on wrapper rollback for state restoration and show a user-facing toast / snackbar if save fails.
 */
