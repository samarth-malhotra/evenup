import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { APP_MODE } from '@/constant';
import { normalizeSupabaseError } from '@/services/helper/errors';
import { useOptimisticMutation } from '@/services/helper/optimisticMutation';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { supabase } from '@/services/supabase';
import { showToast } from '@/stores/atoms/toast';
import type { User } from '@/types';

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    const normalized = normalizeSupabaseError(error);
    if (normalized.type === 'not_found') {
      return null; // safe to treat as no profile
    }
    showToast({ message: 'This came from plain code', type: 'info' });
    if (normalized.type === 'auth_error') {
      // trigger logout or session refresh
      console.warn(normalized.message);
      return null;
    }

    throw new Error(normalized.message);
  }

  return data;
}

export async function updateUserProfileById(payload: {
  userId: string;
  nickname?: string;
  theme?: APP_MODE;
}): Promise<{ nickname?: string; theme?: APP_MODE } | null> {
  const { userId, ...patch } = payload;
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .limit(1)
    .select('nickname, theme')
    .maybeSingle();
  console.log('data: ', data, patch);
  if (error) throw error;
  return data ?? null;
}

export function useUserProfileById(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.profile.me,
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      return await fetchUserProfile(userId);
    },
    // optional: short staleTime so optimistic updates look snappier depending on needs
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });
}

type UpdateProfileVars = {
  id: string;
  patch: Partial<Omit<User, 'id' | 'updated_at'>>; // what we send to update
};

type UpdateProfileResult = User | null;

export function useUpdateUserProfile() {
  const qc = useQueryClient();

  return useOptimisticMutation<
    UpdateProfileResult,
    UpdateProfileVars,
    { previous?: Map<string, any> }
  >({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .limit(1)
        .maybeSingle();
      console.log('data: ', data, patch);
      if (error) throw error;
      return data ?? null;
    },

    // target key for optimistic set/rollback
    targetQueryKey: QUERY_KEYS.profile.me,

    // optimistic: merge patch into cached profile (pure)
    optimisticUpdate: ({ previous, variables }) => {
      const prev: User | null | undefined = previous;
      const now = new Date().toISOString();
      if (!prev) {
        return { id: variables.id, ...variables.patch, updated_at: now } as User;
      }
      return { ...prev, ...variables.patch, updated_at: now } as User;
    },

    // IMPORTANT: do NOT invalidate onSettled; leave cache as-is
    // (either omit invalidateQueryKeys or set to empty list)
    invalidateQueryKeys: [],

    buildContext: ({ previous }) => ({ previous }),

    // On success, just write *local* merged data into cache (no re-fetch)
    // If server returned authoritative row in `data`, prefer that; otherwise fall back to variables.patch
    replaceOnSuccess: ({ data, variables, qc }) => {
      const key = QUERY_KEYS.profile.me;
      if (data) {
        qc.setQueryData(key, data);
        return;
      }
      const current = qc.getQueryData<User | null>(key) ?? null;
      const now = new Date().toISOString();
      const merged = {
        ...(current ?? { id: variables.id }),
        ...variables.patch,
        updated_at: now,
      } as User;
      qc.setQueryData(key, merged);
    },

    // We keep auth error handling options if you need them
  });
}
