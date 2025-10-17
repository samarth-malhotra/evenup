// src/hooks/useGroupDetail.ts
import { useQueryClient } from '@tanstack/react-query';

import type { Group, GroupDetails } from '@/features/groups/types';
import { useSafeQuery } from '@/hooks/useCreateQuery';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
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

  const query = useSafeQuery<GroupDetails | null, SupaError, GroupDetails | null>(
    // queryKey — include groupId (and optionally userId in your key helpers if you prefer)
    QUERY_KEYS.groups.details(groupId ?? ''),

    // fetcher
    async () => {
      if (!groupId) throw new SupaError('groupId required', 'no_group_id');
      return fetchGroupDetail(groupId);
    },

    // options
    {
      enabled: Boolean(groupId),
      // Try to provide a quick initial value from the groups list cache if available
      initialData: () => {
        if (!userId || !groupId) return undefined;

        // read the groups list cache for this user (make sure your groups list key matches this)
        const list = queryClient.getQueryData<Group[]>(QUERY_KEYS.groups.list);

        // If we find the group in the list, map/cast it to GroupDetails-ish initial data.
        // This gives the UI something to render while the full detail fetch completes.
        const found = list?.find((g) => g.id === groupId);
        if (!found) return undefined;

        // NOTE: list's Group type may be a lighter shape than GroupDetails.
        // We cast here so the UI gets an initial object — replace with a proper mapping if needed.
        return found as unknown as GroupDetails;
      },

      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  return { ...query };
}
