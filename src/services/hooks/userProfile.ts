import { useQuery } from '@tanstack/react-query';

import { TOAST_TYPE } from '@/constant';
import { normalizeSupabaseError } from '@/services/helper/errors';
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

    showToast({
      type: TOAST_TYPE.ERROR,
      message: normalized.message,
    });

    if (normalized.type === 'auth_error') {
      // trigger logout or session refresh
      console.warn(normalized.message);
      return null;
    }

    throw new Error(normalized.message);
  }

  return data;
}

export function useUserProfileById(userId: string) {
  return useQuery<User | null, Error>({
    queryKey: QUERY_KEYS.profile.me,
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 1, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (was gcTime)
    refetchOnWindowFocus: false,
  });
}
