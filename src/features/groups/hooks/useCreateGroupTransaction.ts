import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';

import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { addToastAtom } from '@/stores/atoms/toast';

type SplitItem = {
  userId: string;
  amount: number;
  shareType?: string;
  shareMeta?: Record<string, any>;
};

type Payload = {
  title: string;
  amount: number;
  currency?: string;
  paidBy: string;
  groupId?: string;
  createdBy: string;
  receiptUrl?: string | null;
  status?: string;
  metadata?: Record<string, any>;
  splits: SplitItem[];
};

async function createGroupTransactionWithSplits(payload: Payload) {
  return await fetchRPC<{ transactionId: string; createdAt: string }>(
    rpc.create_group_transaction_with_splits,
    { payload }
  );
}

export function useCreateGroupTransaction() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation({
    mutationFn: (payload: Payload) => createGroupTransactionWithSplits(payload),
    onSuccess: (_data, variables) => {
      addToast({ title: 'Success', message: 'Transaction added', type: 'success' });
      qc.invalidateQueries({ queryKey: ['group', variables.groupId, 'transactions', 'infinite'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groups.details(variables.groupId ?? '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groups.list });
    },
    onError: (err: any) => {
      addToast({
        title: 'Error',
        message: err?.message ?? 'Failed to add transaction',
        type: 'error',
      });
    },
  });
}
