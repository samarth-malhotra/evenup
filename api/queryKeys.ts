export const QUERY_KEYS = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  groups: {
    list: ['groups', 'list'] as const,
    details: (id: string) => ['groups', 'details', id] as const,
  },
  expenses: {
    list: (groupId: string) => ['expenses', 'list', groupId] as const,
  },
};
