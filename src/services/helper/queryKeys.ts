// src/constants/queryKeys.ts
export const QUERY_KEYS = {
  // Auth / user --> Not in use
  auth: {
    session: ['auth', 'session'] as const,
    accessToken: ['auth', 'accessToken'] as const,
  },

  // User / profile related
  user: {
    profile: (id: string | null | undefined) => ['user', 'profile', id] as const,
  },

  // Groups
  groups: {
    list: ['groups', 'list'] as const,
    details: (id: string) => ['groups', 'details', id] as const,
    // members: (groupId: string) => ['groups', 'members', groupId] as const,
    // invites: (groupId: string) => ['groups', 'invites', groupId] as const,
  },

  // friends
  friends: {
    list: ['friends', 'list'] as const,
    details: (id: string) => ['friends', 'details', id] as const,
  },

  // Expenses & balances
  expenses: {
    list: (groupId: string) => ['expenses', 'list', groupId] as const,
    details: (expenseId: string) => ['expenses', 'details', expenseId] as const,
    myBalances: (userId: string) => ['expenses', 'balances', userId] as const,
  },

  // Transactions / settlements
  transactions: {
    list: (userId: string) => ['transactions', 'list', userId] as const,
    details: (txId: string) => ['transactions', 'details', txId] as const,
  },

  // Notifications
  notifications: {
    list: (userId: string) => ['notifications', 'list', userId] as const,
    unreadCount: (userId: string) => ['notifications', 'unreadCount', userId] as const,
  },

  // App settings / misc
  settings: {
    app: ['settings', 'app'] as const,
    featureFlags: ['settings', 'featureFlags'] as const,
  },

  // Helpers: small convenience to get a top-level group prefix for invalidation/search
  prefix: (namespace: string) => ['prefix', namespace] as const,
} as const;

export type QueryKey = readonly unknown[];
