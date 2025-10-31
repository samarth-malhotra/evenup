export type Activity = {
  id: string;
  title: string;
  subtitle?: string;
  amountText?: string; // e.g., "₹ 250"
  createdAt: number; // ms timestamp
  read: boolean;
  category?: 'expense' | 'settlement' | 'group' | 'system';
};

// in types.ts (EvenUp project types)
export type PushToken = {
  id: string; // uuid
  user_id: string;
  token: string | null; // Expo push token or platform token
  platform: 'ios' | 'android' | 'web' | 'unknown';
  device_name?: string | null;
  last_seen?: string; // ISO timestamp
  active?: boolean;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>; // deep link info, groupId, expenseId etc.
  read?: boolean;
  created_at?: string;
};
