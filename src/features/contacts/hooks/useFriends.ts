// src/hooks/useFriends.ts
import { useQuery } from '@tanstack/react-query';

import { fetchFriends } from '@/features/contacts/api/fetchFriends';

export default function useFriends(userId?: string) {
  const query = useQuery({
    queryKey: ['friends', userId],
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
