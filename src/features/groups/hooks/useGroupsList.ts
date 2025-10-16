// src/hooks/useGroupsList.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Group } from '@/features/groups/types';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

async function fetchUserGroups(userId: string): Promise<Group[]> {
  return await fetchRPC<Group[]>(rpc.getGroupList, {
    p_user_id: userId,
  });
}

export function useGroupsList(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['groups', userId],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required');
      return (await fetchUserGroups(userId)) ?? [];
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnMount: false,
    // refetchOnMount: 'always',
    //staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });

  const readCached = () => queryClient.getQueryData(['groups', userId]);

  return { ...query, readCached };
}
