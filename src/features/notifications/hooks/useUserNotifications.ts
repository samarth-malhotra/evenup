// useNotificationsInfinite.ts
import { useInfiniteQuery } from '@tanstack/react-query';

import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

// Types (reuse or import from your types file)
export type GetNotificationsPayload = {
  userId: string;
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
};

export type NotificationItem = {
  notification_id: string;
  title: string | null;
  body: string | null;
  subtype?: string | null;
  status?: string | null;
  is_read: boolean;
  created_at: string; // ISO
  meta: {
    group_id: string;
    memberId?: string;
    amount?: string;
    // [key: string]?: string;
  };
};

export type Pagination = {
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
  next_offset: number | null;
};

export type NotificationsData = {
  total: number;
  unread: number;
  notifications: NotificationItem[];
  pagination: Pagination;
};

type QueryKey = ['notifications', string, { limit: number; onlyUnread: boolean }];

async function fetchNotifications(payload: GetNotificationsPayload): Promise<NotificationsData> {
  return await fetchRPC<NotificationsData>(rpc.getNotificationsByUser, {
    p_user_id: payload.userId,
    p_limit: payload.limit,
    p_offset: payload.offset,
    p_only_unread: payload.onlyUnread,
  });
}

/**
 * useNotificationsInfinite
 * - returns flattened notifications array (from pages)
 * - returns combined totals (uses first page as canonical source)
 */
export function useNotificationsInfinite({
  userId,
  limit = 50,
  onlyUnread = false,
  enabled = true,
}: {
  userId: string;
  limit?: number;
  onlyUnread?: boolean;
  enabled?: boolean;
}) {
  const queryKey: QueryKey = ['notifications', userId, { limit, onlyUnread }];

  const result = useInfiniteQuery<NotificationsData, Error, NotificationsData, QueryKey>({
    queryKey,
    queryFn: async ({ pageParam = 0 as number }) => {
      const payload: GetNotificationsPayload = {
        userId,
        limit,
        offset: pageParam,
        onlyUnread,
      };
      return fetchNotifications(payload);
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.pagination?.has_more
        ? (lastPage.pagination.next_offset ?? undefined)
        : undefined;
    },
    keepPreviousData: true,
    enabled: !!userId && enabled,
    staleTime: 0,
  });

  // Flatten pages safely into one notifications array
  const flattenedNotifications: NotificationItem[] =
    result.data?.pages?.flatMap((p) => p.notifications ?? []) ?? result.data?.notifications ?? [];

  // Use the first page as canonical source for totals (server should be consistent)
  const total = result.data?.pages?.[0]?.total ?? result.data?.total ?? 0;
  const unread = result.data?.pages?.[0]?.unread ?? result.data?.unread ?? 0;

  // Compose an aggregated pagination object (from the last page)
  const lastPage = result.data?.pages?.[result.data.pages.length - 1] ?? result.data;
  const pagination: Pagination | undefined = lastPage?.pagination;

  return {
    ...result,
    // helper fields
    notifications: flattenedNotifications,
    total,
    unread,
    pagination,
  };
}

//
export type MarkNotificationReadPayload = {
  p_user_id: string; // UUID of the user
  p_notification_id: string; // UUID of the notification
};

export async function markNotificationRead(
  payload: MarkNotificationReadPayload
): Promise<{ notificationId: string }> {
  return await fetchRPC<{ notificationId: string }>(rpc.markNotificationRead, payload);
}

export async function markAllNotificationRead({ p_user_id }: { p_user_id: string }): Promise<[]> {
  return await fetchRPC<[]>(rpc.markAllNotificationRead, { p_user_id });
}

// Add react query and add pull to refresh feature and also press to read rpc also
