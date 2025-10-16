import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

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
  options?: UseQueryOptions<User | null, SupaError, User>
) {
  return useQuery<User | null, Error>({
    queryKey: QUERY_KEYS.userProfile(userId),
    queryFn: async () => {
      if (!userId) {
        // The fetch function expects a valid id; mimic the behavior of being disabled instead of calling it.
        // Throwing here will surface as query error — we prefer to guard using enabled flag below.
        throw new SupaError('No user id provided to useUserProfile', 'no_user_id');
      }
      return await fetchUserProfile(userId);
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes default - adjust as needed
    retry: (failureCount, error) => {
      // default: retry up to 2 times for network/supabase errors, but not for application RPC errors
      // If error.code is 'supabase_error' (network/permission) allow retry, otherwise don't.
      if ((error as SupaError)?.code === 'supabase_error' && failureCount < 2) return true;
      return false;
    },
    ...options,
  });
}
