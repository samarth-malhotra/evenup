// src/lib/queryKeys.ts
export const QUERY_KEYS = {
  userProfile: (id: string | null | undefined) => ['userProfile', id] as const,
  friends: ['friends', 'userId'] as const, // list of friends (summary items)

  profile: {
    me: ['profile', 'me'] as const, // logged-in user's profile (full)
    details: (userId: string) => ['profile', 'details', userId] as const, // friend's / any user's full profile
    search: (q: string) => ['profile', 'search', q] as const, // optional: search results for users
  },

  groups: {
    list: ['groups', 'list'] as const,
    details: (id: string) => ['groups', 'details', id] as const,
    transactionsInfinite: (groupId?: string) =>
      ['group', groupId, 'transactions', 'infinite'] as const,
  },
  transaction: {
    details: (txId?: string) => ['transaction', txId, 'details'] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
  },
} as const;

// small helper types (optional, handy)
export type QueryKeys = typeof QUERY_KEYS;
export type GroupListKey = typeof QUERY_KEYS.groups.list;
export type GroupDetailsKey = ReturnType<typeof QUERY_KEYS.groups.details>;
export type ProfileMeKey = typeof QUERY_KEYS.profile.me;
export type ProfileDetailsKey = ReturnType<typeof QUERY_KEYS.profile.details>;
// export type ProfileFriendsKey = typeof QUERY_KEYS.profile.friends;
export type ProfileSearchKey = ReturnType<typeof QUERY_KEYS.profile.search>;
