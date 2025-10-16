import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';

import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { addToastAtom } from '@/stores/atoms/toast';

// ---------- Types ----------
type TxItem = {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  paidByName?: string;
  paidByAvatar?: string;
  createdAt?: string;
  hasAttachment?: boolean;
};
type Summary = { totalSpent: number; youOwe: number; friendsOwe: number };
type PaginatedResponse = { transactions: TxItem[]; summary: Summary };

export function useGroupTransactionsPaginated(groupId?: string, userId?: string, pageSize = 10) {
  return useInfiniteQuery<PaginatedResponse, Error>({
    queryKey: ['group', groupId, 'transactions', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      // pageParam is offset
      const res = await fetchRPC<PaginatedResponse>(rpc.get_group_transactions_paginated, {
        p_group_id: groupId,
        p_user_id: userId ?? null,
        p_limit: pageSize,
        p_offset: pageParam,
      });
      return res;
    },
    enabled: !!groupId, // only need groupId to fetch; userId optional
    initialPageParam: 0, // required by v5
    getNextPageParam: (lastPage, pages) =>
      lastPage.transactions.length < pageSize ? undefined : pages.length * pageSize,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export type TransactionDetails = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByName?: string;
  paidByAvatar?: string;
  date: string;
  splitMethod?: string;
  participants: {
    userId: string;
    amount: number;
    name?: string;
  }[];
  comments: {
    id: string;
    user: string;
    message: string;
    createdAt: string;
  }[];
};

export function useTransactionDetails(txId?: string) {
  return useQuery<TransactionDetails>({
    queryKey: ['transaction', txId, 'details'],
    queryFn: async () =>
      await fetchRPC<TransactionDetails>(rpc.get_transaction_details, { p_tx_id: txId }),
    enabled: !!txId,
  });
}

export function useAddTransactionComment() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation({
    mutationFn: async (payload: { transaction_id: string; created_by: string; body: string }) =>
      await fetchRPC(rpc.create_transaction_comment, { payload }),
    onSuccess: (_data, variables) => {
      addToast({ title: 'Comment', message: 'Comment added', type: 'success' });
      qc.invalidateQueries({ queryKey: ['transaction', variables.transaction_id, 'details'] });
    },
    onError: (err: any) => {
      addToast({ title: 'Error', message: err?.message ?? 'Failed to add comment', type: 'error' });
    },
  });
}
