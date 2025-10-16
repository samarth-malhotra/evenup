import { useCreateQuery } from '@/hooks/useCreateQuery';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { SupaError } from '@/services/supabase/supaError';
import type { User } from '@/types';

export async function fetchUserProfile(userId: string): Promise<User> {
  return await fetchRPC<User>(rpc.getUserProfileById, {
    p_user_id: userId,
  });
}

export function useUserProfile(
  userId: string | null | undefined,
  options?: Omit<
    Parameters<typeof useCreateQuery<User | null, SupaError, User | null>>[2],
    'queryKey'
  >
) {
  return useCreateQuery<User | null, SupaError, User | null>(
    QUERY_KEYS.userProfile(userId),
    async () => {
      if (!userId) throw new SupaError('No user id provided to useUserProfile', 'no_user_id');
      return await fetchUserProfile(userId);
    },
    {
      enabled: Boolean(userId),
      ...options,
    }
  );
}
