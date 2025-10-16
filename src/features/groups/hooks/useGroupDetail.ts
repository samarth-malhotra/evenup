// src/hooks/useGroupDetail.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Group, GroupDetails } from '@/features/groups/types';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { SupaError } from '@/services/supabase/supaError';

/**
 * Fetch group details.
 * - Throws SupaError on app-level error (ok: false).
 * - Throws SupaError on Supabase-level error.
 * - Returns GroupDetails | null (null rarely—kept for backward compatibility).
 */
export async function fetchGroupDetail(groupId: string): Promise<GroupDetails | null> {
  return await fetchRPC<GroupDetails | null>(rpc.getGroupDetails, {
    p_group_id: groupId,
  });
}

export function useGroupDetail(userId: string | undefined, groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<GroupDetails | null, SupaError>({
    queryKey: ['group', groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) throw new SupaError('groupId required', 'no_group_id');
      return fetchGroupDetail(groupId);
    },
    initialData: () => {
      if (!userId || !groupId) return undefined;
      const list = queryClient.getQueryData<Group[]>(['groups', userId]);
      return list?.find((g) => g.id === groupId) as unknown as any | undefined;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
