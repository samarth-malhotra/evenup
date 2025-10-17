// src/hooks/useFriends.ts

import { useSafeQuery } from '@/hooks/useCreateQuery';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import type { SupaError } from '@/services/supabase/supaError';

type FriendRPC = {
  friendship_id: string;
  friend_id: string;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
};

export async function fetchFriends(userId: string | undefined): Promise<FriendRPC[]> {
  if (!userId) return [];
  return await fetchRPC<FriendRPC[]>(rpc.getFriendList, {
    p_user_id: userId,
  });
}

export default function useFriends(userId?: string) {
  const query = useSafeQuery<FriendRPC[], SupaError, FriendRPC[]>(
    // queryKey
    QUERY_KEYS.friends.list,

    // fetcher
    () => fetchFriends(userId),

    // options
    {
      enabled: !!userId,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    }
  );

  return {
    friends: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as unknown as SupaError | null,
    refetch: query.refetch,
    // expose raw query for advanced use
    query,
  };
}
