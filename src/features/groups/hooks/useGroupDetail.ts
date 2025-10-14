// src/hooks/useGroupDetail.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

// import { fetchGroupDetail } from '@/api/fetchGroupDetail';
import type { Group, GroupDetails } from '@/features/groups/types';
import { supabase } from '@/services/supabase';
// import type { Group } from '@/types';

async function fetchGroupDetail(groupId: string): Promise<GroupDetails | null> {
  // NOTE: rpc returns data as JSON (jsonb). The exact shape depends on your function.
  const { data, error } = await supabase.rpc('get_group_details', { p_group_id: groupId }); // <-- named param must match function

  if (error) {
    throw error;
  }

  if (data == null) return null;

  //   if (typeof data === 'object' && 'get_group_details' in (data as any)) {
  //     return (data as any).get_group_details ?? {};
  //   }
  // If data is directly the array:
  return data as unknown as GroupDetails;
}

export function useGroupDetail(userId: string | undefined, groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<GroupDetails | null>({
    queryKey: ['group', groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) throw new Error('groupId required');
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
