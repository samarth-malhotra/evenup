// POST /api/notifications
import { edge } from '@/services/supabase/constant';
import { edgeFunction } from '@/services/supabase/edgeFunctions';

export enum NotificationType {
  GroupDeleted = 'group_deleted',
  GroupMemberAdded = 'group_member_added',
  GroupMemberDeleted = 'group_member_deleted',
  GroupMemberLeft = 'group_member_left',

  ExpenseCreated = 'expense_created',
  ExpenseDeleted = 'expense_deleted',
  ExpenseUpdated = 'expense_updated',
  BalanceSettled = 'balance_settled',
  PaymentRecorded = 'payment_recorded',

  SystemAnnouncement = 'system_announcement',
  SystemInfo = 'system_info',
  PaymentReminder = 'payment_reminder',
  WeeklySummary = 'weekly_summary',
}

export interface NotificationPayloadData {
  // in case any kind of transcation always send transactionId and description
  transactionId?: string;
  description?: string;
  // optional memberId for certain group events if caller wants to include target member
  memberId?: string;
  // other arbitrary keys allowed
  [key: string]: unknown;
}

// main request body
export interface ClientNotificationPayload {
  accessToken: string;
  actorId: string; // uuid of the actor (sender)
  groupId: string; // uuid of the group (used to resolve members / validate transactions)
  // caller MUST include group_name here if they want group_name present in notifications
  group_name: string;
  subtype: `${NotificationType}`;
  locale?: string; // default "en"
  data?: NotificationPayloadData; // optional additional payload; will be stored in notifications.data JSON
}

export interface ClientNotificationsResponse {
  notification_group_id: string;
  created: number;
  inserted: {
    id: string;
    user_id: string;
    status: string;
  }[];
  enqueued: { enqueued: boolean; rpc: number[] }[];
}

export async function sendNotifications(
  payload: ClientNotificationPayload
): Promise<ClientNotificationsResponse> {
  const { accessToken, ...rest } = payload;
  const path = `${edge.sendNotifications}`;
  const response = await edgeFunction<ClientNotificationsResponse>(path, {
    method: 'POST',
    body: rest,
    accessToken,
  });

  return response as ClientNotificationsResponse;
}
