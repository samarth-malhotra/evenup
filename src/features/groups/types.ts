import type { USER_STATUS } from '@/constant';

export type BalanceSummary = {
  net_amount: number; // net = transactions_net - settlements_net
  abs_amount: number; // absolute of net_amount
  currency: string; // 'INR'
  status: 'friends_owe' | 'you_owe' | 'settled';
};

export type Group = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
  simplified: boolean;
  updated_at: string;
  balance_summary?: BalanceSummary | null;
};

export type GroupDetails = {
  id: string;
  name: string;
  avatar_url: string | null;
  simplified: boolean;
  members: GroupMember[] | [];
};

export type GroupMember = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  email: string | null;
  phone: string | null;
  phone_hash: string | null;
  email_hash: string | null;
  avatar_url: string | null;
  status_in_group: 'active' | 'deleted';
  currency: string;
  language: string;
  account_status: USER_STATUS;
};
