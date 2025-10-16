// src/hooks/useFriends.ts
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

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
  const query = useQuery({
    queryKey: QUERY_KEYS.friends,
    queryFn: () => fetchFriends(userId),
    enabled: !!userId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  return {
    friends: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    // expose the whole query if caller wants advanced usage
    query,
  };
}
