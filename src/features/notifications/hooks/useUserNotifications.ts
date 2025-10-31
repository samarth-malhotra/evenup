import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

// ---------- request / payload ----------
export type GetNotificationsPayload = {
  userId: string; // uuid string
  limit?: number; // default 50
  offset?: number; // default 0
  onlyUnread?: boolean; // when true, return only unread notifications
};

// ---------- notification item (returned) ----------
export type NotificationItem = {
  notification_id: string; // uuid
  title: string | null;
  body: string | null;
  subtype?: string | null;
  status?: string | null;
  is_read: boolean;
  created_at: string; // ISO timestamp
};

// ---------- pagination metadata ----------
export type Pagination = {
  limit: number;
  offset: number;
  count: number; // number returned in this page
  has_more: boolean;
  next_offset: number | null;
};

// ---------- data envelope ----------
export type NotificationsData = {
  total: number; // total count excluding title+body-null rows
  unread: number; // unread count (is_read = false), same exclusion
  notifications: NotificationItem[];
  pagination: Pagination;
};

async function fetchNotifications(payload: GetNotificationsPayload): Promise<NotificationsData> {
  return await fetchRPC<NotificationsData>(rpc.createGroup, payload);
}

export type MarkNotificationReadPayload = {
  p_user_id: string; // UUID of the user
  p_notification_id: string; // UUID of the notification
};

async function markNotificationRead(
  payload: MarkNotificationReadPayload
): Promise<{ notificationId: string }> {
  return await fetchRPC<{ notificationId: string }>(rpc.markNotificationRead, payload);
}

async function markAllNotificationRead({ p_user_id }: { p_user_id: string }): Promise<[]> {
  return await fetchRPC<[]>(rpc.markAllNotificationRead, { p_user_id });
}

// Add react query and add pull to refresh feature and also press to read rpc also
