// src/features/expenses/useAddExpense.ts

import { api } from '@/api/axios';
import { useOptimisticMutation } from '@/api/helper/optimisticMutation';
import { QUERY_KEYS } from '@/api/queryKeys';
import { Expense } from '@/types';

type AddExpenseVars = Partial<Expense>;
type AddExpenseResp = Expense;
type Context = { previous?: Expense[] };

export function useAddExpense(groupId: string) {
  return useOptimisticMutation<AddExpenseResp, AddExpenseVars, Context>({
    mutationFn: (vars) => api.post<AddExpenseResp>(`/groups/${groupId}/expenses`, vars),
    targetQueryKey: QUERY_KEYS.expenses.list(groupId), // main cache we optimistically modify
    optimisticUpdate: ({ previous, variables }) => {
      const prevArr = (previous as Expense[] | undefined) ?? [];
      const optimistic: Expense = {
        ...(variables as Expense),
        id: `optimistic-${Date.now()}`,
        createdAt: new Date().toISOString(),
        groupId,
      } as Expense;
      return [optimistic, ...prevArr];
    },
    // invalidate list + group details after settle
    invalidateQueryKeys: [QUERY_KEYS.expenses.list(groupId), QUERY_KEYS.groups.details(groupId)],
    // optional: update other keys immediately too
    extraOnMutate: ({ qc, variables }) => {
      // e.g. bump group's lastActivity timestamp in group detail cache
      try {
        qc.setQueryData(QUERY_KEYS.groups.details(groupId), (old: any) => {
          if (!old) return old;
          return { ...old, lastActivity: new Date().toISOString() };
        });
      } catch (e) {}
    },
    buildContext: ({ previous }) => ({ previous }),
  });
}
