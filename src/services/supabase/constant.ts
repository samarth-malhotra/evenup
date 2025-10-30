const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonkey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const sb = {
  baseUrl,
  anonkey,
} as const;

const functionVersion = `${sb.baseUrl}/functions/v1`;

export const edge = {
  signup: `${functionVersion}/signup`,
  addMember: `${functionVersion}/add-member`,
  sendNotifications: `${functionVersion}/enqueue_notification`,
  generateDeviceToken: `${functionVersion}/upsert-push-token`,
} as const;

export const rpc = {
  createGroup: `create_group`,
  getGroupDetails: 'get_group_details',
  deleteGroup: 'delete_group',
  deleteGroupMember: 'delete_group_member',
  getGroupList: 'get_user_groups',
  getUserProfileById: 'get_user_profile_by_id',
  updateUserProfile: 'update_user_profile',
  getFriendList: 'get_friends',
  create_group_transaction_with_splits: 'create_group_transaction_with_splits',
  get_group_transactions_paginated: 'get_group_transactions_paginated',
  get_transaction_details: 'get_transaction_details',
  create_transaction_comment: 'create_transaction_comment',
  delete_transaction: 'delete_group_transaction',
  update_transaction_comment: 'update_transaction_comment',
  delete_transaction_comment: 'delete_transaction_comment',
  update_group_transaction_with_splits: 'update_group_transaction_with_splits',
  get_transaction_summary: 'get_transaction_summary',
} as const;
