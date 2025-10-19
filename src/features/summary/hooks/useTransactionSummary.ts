import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

export type TransactionTotals = { totalSpent: number; youOwe: number; friendsOwe: number };
export type TransactionBar = { month: string; total: number };
export type TransactionItem = {
  id: string;
  title: string;
  date: string;
  amount: number;
  groupName: string;
};
export type TransactionCursor = { createdAt: string; id: string } | null;

type TransactionSummaryRPC = {
  totals: TransactionTotals;
  chart: TransactionBar[];
  transactions: TransactionItem[];
  nextCursor: TransactionCursor;
};

export function useTransactionHeader(
  userId?: string,
  startISO?: string | null,
  endISO?: string | null
) {
  return useQuery({
    enabled: !!userId && !!startISO && !!endISO,
    queryKey: ['transaction-summary', 'header', userId, startISO, endISO],
    queryFn: async () => {
      const res = await fetchRPC<TransactionSummaryRPC>(rpc.get_transaction_summary, {
        p_user_id: userId,
        p_start: startISO,
        p_end: endISO,
        p_limit: 1,
        p_cursor_created_at: null,
        p_cursor_id: null,
      });
      return { totals: res.totals, chart: res.chart };
    },
    staleTime: 60_000,
  });
}

export function useTransactionFeed(params: {
  userId?: string;
  startISO?: string | null;
  endISO?: string | null;
  pageSize?: number;
}) {
  const { userId, startISO, endISO, pageSize = 10 } = params;

  return useInfiniteQuery({
    enabled: !!userId && !!startISO && !!endISO,
    queryKey: ['transaction-summary', 'feed', userId, startISO, endISO, pageSize],
    initialPageParam: null as TransactionCursor,
    queryFn: async ({ pageParam }) => {
      const res = await fetchRPC<TransactionSummaryRPC>(rpc.get_transaction_summary, {
        p_user_id: userId,
        p_start: startISO,
        p_end: endISO,
        p_limit: pageSize,
        p_cursor_created_at: pageParam?.createdAt ?? null,
        p_cursor_id: pageParam?.id ?? null,
      });
      return res;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
