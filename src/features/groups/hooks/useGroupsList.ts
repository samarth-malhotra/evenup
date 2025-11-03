// src/hooks/useGroupsInfinite.ts
import type { QueryKey } from '@tanstack/react-query';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import type { Group } from '@/features/groups/types';
import type { Pagination } from '@/features/notifications/hooks/useUserNotifications';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

export type UserGroupsResponse = {
  total_count: number;
  groups: Group[];
  pagination: Pagination;
};

export type UserGroupPayload = {
  userId: string;
  limit?: number;
  offset?: number;
};

async function fetchUserGroups(payload: UserGroupPayload): Promise<UserGroupsResponse> {
  const { userId, limit = 20, offset = 0 } = payload;
  return await fetchRPC<UserGroupsResponse>(rpc.getGroupList, {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });
}

/**
 * Infinite hook for groups list - typed for TS.
 */
export function useGroupsInfinite(payload: UserGroupPayload) {
  const queryClient = useQueryClient();
  const { userId, limit = 20, offset = 0 } = payload;

  // Strongly type the query key as a const tuple so TS knows the key shape
  const queryKey: QueryKey = ['groups', userId, { limit }];

  /**
   * Generics for useInfiniteQuery:
   *  - TQueryFnData = UserGroupsResponse (the page shape returned by queryFn)
   *  - TError = Error
   *  - TData = UserGroupsResponse (the aggregated data shape, unchanged here)
   *  - TQueryKey = typeof queryKey
   */
  const query = useInfiniteQuery<UserGroupsResponse, Error, UserGroupsResponse, typeof queryKey>({
    queryKey,
    // explicitly type pageParam so it's not `unknown`
    queryFn: async ({ pageParam = offset }) => {
      if (!userId) throw new Error('userId is required');
      // pageParam is the offset for this page (number)
      return await fetchUserGroups({ userId, limit, offset: pageParam });
    },
    initialPageParam: 0, // Initial cursor for the first page
    enabled: Boolean(userId),
    getNextPageParam: (lastPage) => {
      // Use your Pagination type fields:
      const pagination = lastPage.pagination as Pagination | undefined;
      // Prefer backend-provided next_offset if present
      const nextOffset =
        pagination?.next_offset ?? (pagination ? pagination.offset + pagination.limit : undefined);

      // If next_offset is null/undefined -> no next page
      if (nextOffset == null) return undefined;

      // Use total_count if available to guard
      if (typeof lastPage.total_count === 'number') {
        return nextOffset < lastPage.total_count ? nextOffset : undefined;
      }

      // Fallback: if last page returned `groups.length >= limit` assume there may be more
      return lastPage.groups.length >= limit ? nextOffset : undefined;
    },

    // caching / stale options (adjust to taste)
    staleTime: 30_000,
    refetchOnMount: false,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });

  // Merged groups array from pages (each page is UserGroupsResponse)
  const groups: Group[] = query.data?.pages.flatMap((p) => p.groups) ?? [];

  // Total count (from first page if present)
  const total = query.data?.pages?.[0]?.total_count ?? 0;

  const hasNextPage = query.hasNextPage;

  const readCached = () => queryClient.getQueryData(queryKey);

  return {
    ...query,
    groups,
    total,
    hasNextPage,
    readCached,
  };
}
