// src/features/groups/hooks/useCreateGroupTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';

import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { addToastAtom } from '@/stores/atoms/toast';

/** ---------- Types ---------- */
type SplitItem = {
  userId: string;
  amount: number;
  shareType?: 'exact' | 'equal' | 'percent';
  shareMeta?: Record<string, any>;
};

type Payload = {
  title: string;
  amount: number;
  currency?: string;
  paidBy: string; // uuid
  groupId?: string; // uuid
  createdBy: string; // uuid
  receiptUrl?: string | null;
  status?: string;
  metadata?: Record<string, any>;
  splits: SplitItem[];
};

/** ---------- RPC Wrapper ---------- */
/**
 * Calls Supabase RPC: public.create_group_transaction_with_splits
 * Expects payload JSONB exactly matching SQL definition (no nesting).
 */
export async function createGroupTransactionWithSplits(payload: Payload) {
  // ✅ Pass raw payload — do NOT wrap in { payload: ... }
  return await fetchRPC(rpc.create_group_transaction_with_splits, { payload });
}

/** ---------- React Query Hook ---------- */
export function useCreateGroupTransaction() {
  const queryClient = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation({
    mutationFn: (payload: Payload) => createGroupTransactionWithSplits(payload),

    onSuccess: (data, variables) => {
      console.log('[createGroupTransaction] success:', data);

      addToast({
        title: 'Success',
        message: 'Transaction added successfully',
        type: 'success',
      });

      // invalidate group details (so transactions / balances refresh)
      if (variables.groupId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.groups.details(variables.groupId),
        });
      }

      // refresh group list (in case summary data changes)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.groups.list,
      });
    },

    onError: (err: any) => {
      console.error('[createGroupTransaction] error:', err);
      const message = err?.message ?? err?.error ?? 'Failed to add transaction. Please try again.';
      addToast({
        title: 'Error',
        message,
        type: 'error',
      });
    },

    // Retry up to twice for transient Supabase/network errors
    retry: (failureCount, error) => {
      if ((error as any)?.code === 'supabase_error' && failureCount < 2) return true;
      return false;
    },
  });
}
