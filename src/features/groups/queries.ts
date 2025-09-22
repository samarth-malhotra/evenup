// src/features/expenses/queries.ts
import { api } from '@/api/axios';
import { QUERY_KEYS } from '@/api/queryKeys';
import { Expense } from '@/types';
import { useQuery } from '@tanstack/react-query';

export function useExpenses(groupId: string) {
  return useQuery<Expense[]>({
    queryKey: QUERY_KEYS.expenses.list(groupId),
    queryFn: async () => {
      return api.get<Expense[]>(`/groups/${groupId}/expenses`);
    },
    enabled: !!groupId,
    // keepPreviousData: true,
    // staleTime, cacheTime etc can still be added here
  });
}
