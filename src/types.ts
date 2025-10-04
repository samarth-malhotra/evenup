// ==============================
// EvenUp Mock Dataset Types
// ==============================

import type {
  ActivityTypeEnum,
  APP_MODE,
  COLOR_SHADE,
  ExpenseStatusEnum,
  FriendStatusEnum,
  MemberRoleEnum,
  SplitMethodEnum,
  USER_STATUS,
} from '@/constant';

// Generic base entity (for extendability)
export type AppModeType = `${APP_MODE}`;
export type ShadeType = `${COLOR_SHADE}`;

export interface BaseEntity {
  id: string;
}

// ---------------- Users ----------------
// export interface User extends BaseEntity {
//   email: string;
//   name: string;
//   avatarUrl?: string;
//   phone?: string;
//   createdAt?: string;
// }

// ---------------- Friends ----------------
export type FriendStatus = `${FriendStatusEnum}`;
export interface Friend extends BaseEntity {
  requesterId: string; // user who initiated the request
  addresseeId: string; // user who receives the request
  status: FriendStatus; // pending | accepted | blocked | removed
  nicknameForRequester?: string | null; // optional local nickname set by requester
  nicknameForAddressee?: string | null; // optional local nickname for addressee's view
  isFavorite?: boolean; // quick UI flag
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string | null;
  lastInteractedAt?: string | null; // optional for sort by recent contact
}

// ---------------- Groups ----------------
export interface Group extends BaseEntity {
  name: string;
  description?: string;
  currency?: string; // default: "INR"
  createdBy: string; // userId
  createdAt: string;
  members?: string;
}

// ---------------- Group Members ----------------
export type MemberRole = `${MemberRoleEnum}`;
export interface GroupMember extends BaseEntity {
  groupId: string;
  userId: string;
  role?: MemberRole;
  nickname?: string;
  shareWeight?: number; // default: 1
  joinDate?: string;
  isActive?: boolean;
}

// ---------------- Expenses ----------------
export type SplitMethod = `${SplitMethodEnum}`;
export type ExpenseStatus = `${ExpenseStatusEnum}`;

export interface Expense extends BaseEntity {
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string; // default: "INR"
  paidBy: string; // userId
  createdBy?: string; // userId
  date?: string;
  splitMethod: SplitMethod;
  status?: ExpenseStatus;
  createdAt?: string;
  updatedAt?: string;
  payerId: string;
}

// ---------------- Expense Shares ----------------
export interface ExpenseShare extends BaseEntity {
  expenseId: string;
  userId: string;
  shareAmount: number;
  sharePercent?: number;
  isSettled?: boolean;
  settledAt?: string;
  note?: string;
}

// ---------------- Transactions ----------------
export interface Transaction extends BaseEntity {
  fromUser: string; // userId
  toUser: string; // userId
  groupId?: string; // optional for direct friend payments
  amount: number;
  currency?: string; // default: "INR"
  method?: 'upi' | 'cash' | 'bank_transfer' | 'in-app';
  createdAt?: string;
  note?: string;
}

// ---------------- Activities ----------------
export type ActivityType = `${ActivityTypeEnum}`;
export interface Activity extends BaseEntity {
  groupId: string;
  userId: string;
  type: ActivityType;
  meta?: Record<string, any>;
  createdAt?: string;
}

// ---------------- Notifications ----------------
export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead?: boolean;
  createdAt?: string;
}

// ---------------- Dataset Wrapper ----------------
export interface EvenUpMockData {
  users: User[];
  friends: Friend[];
  groups: Group[];
  group_members?: GroupMember[];
  expenses: Expense[];
  expense_shares: ExpenseShare[];
  transactions: Transaction[];
  activities?: Activity[];
  notifications?: Notification[];
}

// New types
export type User = {
  id: string; // uuid
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  currency?: string;
  language?: string;
  theme?: APP_MODE; // public.theme_enum (can also be an enum if you share values)
  nickname?: string;
  status?: USER_STATUS; // enum instead of string
  invited_by?: string; // uuid
  last_active_at?: string; // ISO timestamp string
  metadata?: Record<string, any>; // jsonb
  created_at?: string; // ISO timestamp string
  updated_at?: string; // ISO timestamp string
  deleted_at?: string; // ISO timestamp string
};
