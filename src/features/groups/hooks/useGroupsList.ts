// src/hooks/useGroupsList.ts
import { useQueryClient } from '@tanstack/react-query';

import type { Group } from '@/features/groups/types';
import { useSafeQuery } from '@/hooks/useCreateQuery';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { SupaError } from '@/services/supabase/supaError';

async function fetchUserGroups(userId: string): Promise<Group[]> {
  return await fetchRPC<Group[]>(rpc.getGroupList, {
    p_user_id: userId,
  });
}

export function useGroupsList(userId?: string) {
  const queryClient = useQueryClient();

  const query = useSafeQuery<Group[], SupaError, Group[]>(
    // queryKey (include userId to prevent shared cache)
    QUERY_KEYS.groups.list,

    // fetcher
    async () => {
      if (!userId) throw new SupaError('userId is required', 'invalid_args');
      return (await fetchUserGroups(userId)) ?? [];
    },

    // options
    {
      enabled: Boolean(userId),
      staleTime: 30_000,
      refetchOnMount: false,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    }
  );

  // convenient helper to read cached data
  const readCached = () => queryClient.getQueryData<Group[]>(QUERY_KEYS.groups.list);

  return {
    ...query,
    readCached,
  };
}
