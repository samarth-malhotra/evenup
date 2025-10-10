// src/hooks/useUserGroups.ts
import { useQuery } from '@tanstack/react-query';

import type { Group } from '@/features/groups/components/GroupList';
import { supabase } from '@/services/supabase'; // adjust path
// import type { Group } from '@/types/evenup';

async function fetchUserGroups(userId: string): Promise<Group[]> {
  // NOTE: rpc returns data as JSON (jsonb). The exact shape depends on your function.
  const { data, error } = await supabase.rpc('get_user_groups', { p_user_id: userId }); // <-- named param must match function

  if (error) {
    // Bubble up error to react-query so user can handle retries, etc.
    throw error;
  }

  // If your function returns jsonb aggregated array, `data` will already be the array.
  // Type coercion: if rpc returns a single jsonb column named get_user_groups, supabase
  // might wrap it as { get_user_groups: [...] } depending on version; handle both:
  if (data == null) return [];
  // If data is an object and contains the key (some supabase versions):
  if (typeof data === 'object' && 'get_user_groups' in (data as any)) {
    return (data as any).get_user_groups ?? [];
  }
  // If data is directly the array:
  return data as unknown as Group[];
}

export function useUserGroups(userId?: string) {
  console.log('group api is called');
  return useQuery({
    queryKey: ['userGroups', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return fetchUserGroups(userId);
    },
    enabled: Boolean(userId),
    staleTime: 5_000, // 5 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
}
