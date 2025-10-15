// src/hooks/useGroupDetail.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Group, GroupDetails } from '@/features/groups/types';
import { RPCError } from '@/services/supabase/RPCError';
import { RPCFunctions } from '@/services/supabase/RPCFunctions';
import { supabase } from '@/services/supabase/supabase';

export interface GroupDetailsRPC {
  ok: boolean;
  data?: GroupDetails;
  error?: string;
  message?: string;
}

/**
 * Fetch group details.
 * - Throws RPCError on app-level error (ok: false).
 * - Throws RPCError on Supabase-level error.
 * - Returns GroupDetails | null (null rarely—kept for backward compatibility).
 */
export async function fetchGroupDetail(groupId: string): Promise<GroupDetails | null> {
  const { data, error } = await supabase.rpc(RPCFunctions.getGroupDetails, { p_group_id: groupId });

  // Supabase-level error (network / permission / etc.)
  if (error) {
    // Throw so React Query's error handler receives it
    throw new RPCError(error.message || 'Supabase RPC error', 'supabase_error');
  }

  // Unexpected empty result
  if (!data) {
    throw new RPCError('No data returned from RPC', 'no_data');
  }

  const response = data as GroupDetailsRPC;

  // Application-level error from your SQL function (e.g. not_a_group_member)
  if (!response.ok) {
    // include both code and human message
    throw new RPCError(response.message ?? 'RPC returned an error', response.error);
  }

  // If group data missing, treat as error (you could return null if you prefer)
  if (!response.data) {
    // Either return null or throw — throwing ensures UI receives error details.
    throw new RPCError('Missing group data in RPC response', 'missing_group');
  }

  return response.data ?? null;
}

export function useGroupDetail(userId: string | undefined, groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<GroupDetails | null, RPCError>({
    queryKey: ['group', groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) throw new RPCError('groupId required', 'no_group_id');
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
