// src/features/groups/hooks/transactions.mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';

import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import { addToastAtom } from '@/stores/atoms/toast';

// Types (adapt to your app types)
type TxSplit = { userId: string; amount: number; shareType?: string; shareMeta?: any };
type CreateTxPayload = {
  title: string;
  amount: number;
  currency?: string;
  paidBy: string;
  groupId?: string | null;
  createdBy: string;
  metadata?: any;
  splits?: TxSplit[];
};

// Utility to find group transaction-infinite keys (loose typing for flexibility)
function findGroupTransactionKeys(qc: ReturnType<typeof useQueryClient>) {
  return qc
    .getQueryCache()
    .findAll()
    .map((q: any) => q.queryKey)
    .filter((k: any[]) => k?.[0] === 'group' && k?.[3] === 'infinite');
}

// ----------------- CREATE -----------------
export function useCreateGroupTransaction(pageSize = 10) {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation<any, any, CreateTxPayload>({
    mutationFn: async (payload: CreateTxPayload) =>
      // use RPC name that exists in your mapping
      await fetchRPC(rpc.create_group_transaction_with_splits, { payload }),
    onMutate: async (payload: CreateTxPayload) => {
      const tempId = `temp-${uuidv4()}`;
      const createdAt = new Date().toISOString();

      const optimisticTx = {
        id: tempId,
        title: payload.title,
        amount: payload.amount,
        paidBy: payload.paidBy,
        paidByName: undefined,
        paidByAvatar: undefined,
        createdAt,
        hasAttachment: false,
      };

      // normalize null -> undefined to satisfy QUERY_KEYS typing
      const normalizedGroupId = payload.groupId ?? undefined;
      const key = QUERY_KEYS.groups.transactionsInfinite(normalizedGroupId);
      const previous = qc.getQueryData<any>(key);

      if (previous) {
        qc.setQueryData(key, (old: any) => ({
          ...old,
          pages: old.pages.map((p: any, idx: number) =>
            idx === 0 ? { ...p, transactions: [optimisticTx, ...(p.transactions ?? [])] } : p
          ),
        }));
      } else {
        qc.setQueryData(key, {
          pages: [
            {
              transactions: [optimisticTx],
              summary: { totalSpent: payload.amount, youOwe: 0, friendsOwe: 0 },
            },
          ],
          pageParams: [0],
        });
      }

      return { previous, tempId, key };
    },
    onError: (err: any, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
      addToast({
        title: 'Create failed',
        message: (err as any)?.message ?? 'Could not create transaction',
        type: 'error',
      });
    },
    onSuccess: (data: any, vars, context: any) => {
      const serverId = data?.data?.id;
      const serverCreatedAt = data?.data?.createdAt;
      const normalizedGroupId = (vars as CreateTxPayload).groupId ?? undefined;
      const key = context?.key ?? QUERY_KEYS.groups.transactionsInfinite(normalizedGroupId);

      qc.setQueryData(key, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            transactions: (p.transactions || []).map((t: any) =>
              t.id === context?.tempId
                ? { ...t, id: serverId ?? t.id, createdAt: serverCreatedAt ?? t.createdAt }
                : t
            ),
          })),
        };
      });

      // background reconcile to fetch authoritative data (payer names, splits)
      qc.invalidateQueries({ queryKey: key });
      addToast({ title: 'Created', message: 'Transaction created', type: 'success' });
    },
  });
}

// ----------------- DELETE TRANSACTION -----------------
export function useDeleteTransaction() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation<any, any, { txId: string; groupId?: string; performedBy?: string }>({
    mutationFn: async ({ txId, performedBy }) =>
      await fetchRPC(rpc.delete_transaction, { p_tx_id: txId, performed_by: performedBy ?? null }),
    onMutate: async ({ txId, groupId }) => {
      const normalizedGroupId = groupId ?? undefined;
      const groupKey = QUERY_KEYS.groups.transactionsInfinite(normalizedGroupId);
      const previousGroup = qc.getQueryData<any>(groupKey);
      if (previousGroup) {
        qc.setQueryData(groupKey, (old: any) => ({
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            transactions: (p.transactions || []).filter((t: any) => t.id !== txId),
          })),
        }));
      }
      const txKey = QUERY_KEYS.transaction.details(txId);
      const previousTx = qc.getQueryData<any>(txKey);
      qc.removeQueries({ queryKey: txKey, exact: true });
      return { previousGroup, previousTx };
    },
    onError: (err: any, vars: any, context: any) => {
      const groupKey = QUERY_KEYS.groups.transactionsInfinite(vars.groupId ?? undefined);
      if (context?.previousGroup) qc.setQueryData(groupKey, context.previousGroup);
      if (context?.previousTx)
        qc.setQueryData(QUERY_KEYS.transaction.details(vars.txId), context.previousTx);
      addToast({
        title: 'Delete failed',
        message: (err as any)?.message ?? 'Could not delete transaction',
        type: 'error',
      });
    },
    onSuccess: () => {
      // revalidate groups
      qc.getQueryCache()
        .findAll()
        .forEach((q: any) => {
          const k = q.queryKey as any[];
          if (k?.[0] === 'group' && k?.[3] === 'infinite') qc.invalidateQueries({ queryKey: k });
        });
      addToast({ title: 'Transaction deleted', message: 'Removed', type: 'success' });
    },
  });
}

// ----------------- COMMENTS -----------------
export function useAddTransactionComment() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation<any, any, { transaction_id: string; created_by: string; body: string }>({
    mutationFn: async (payload) => await fetchRPC(rpc.create_transaction_comment, { payload }),
    onMutate: async (payload) => {
      const txKey = QUERY_KEYS.transaction.details(payload.transaction_id);
      const previous = qc.getQueryData<any>(txKey);
      const optimistic = {
        id: `temp-${uuidv4()}`,
        userId: payload.created_by,
        user: undefined,
        message: payload.body,
        createdAt: new Date().toISOString(),
      };
      if ((previous as any)?.data)
        qc.setQueryData(txKey, (old: any) => ({
          ...old,
          data: { ...old.data, comments: [optimistic, ...(old.data.comments ?? [])] },
        }));
      return { previous };
    },
    onError: (err: any, vars: any, context: any) => {
      const txKey = QUERY_KEYS.transaction.details(vars.transaction_id);
      if (context?.previous) qc.setQueryData(txKey, context.previous);
      addToast({
        title: 'Comment failed',
        message: (err as any)?.message ?? 'Could not add comment',
        type: 'error',
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transaction.details(vars.transaction_id) });
      addToast({ title: 'Comment added', message: 'Saved', type: 'success' });
    },
  });
}

export function useUpdateTransactionComment() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation<any, any, { commentId: string; body: string }>({
    mutationFn: async ({ commentId, body }) =>
      await fetchRPC(rpc.update_transaction_comment, {
        p_comment_id: commentId,
        p_body: body,
        p_modified_by: null,
      }),
    onMutate: async ({ commentId, body }) => {
      const snapshots: Record<string, any> = {};
      qc.getQueryCache()
        .findAll()
        .forEach((q: any) => {
          const key = q.queryKey as any[];
          if (key?.[0] === 'transaction') {
            const data = qc.getQueryData<any>(key);
            if ((data as any)?.data?.comments) {
              const idx = data.data.comments.findIndex((c: any) => c.id === commentId);
              if (idx !== -1) {
                snapshots[JSON.stringify(key)] = data;
                qc.setQueryData(key, (old: any) => ({
                  ...old,
                  data: {
                    ...old.data,
                    comments: old.data.comments.map((c: any) =>
                      c.id === commentId ? { ...c, message: body } : c
                    ),
                  },
                }));
              }
            }
          }
        });
      return { snapshots };
    },
    onError: (err: any, vars: any, context: any) => {
      for (const [k, v] of Object.entries(context?.snapshots ?? {})) {
        try {
          qc.setQueryData(JSON.parse(k), v);
        } catch (e) {
          void e;
        }
      }
      addToast({
        title: 'Update failed',
        message: (err as any)?.message ?? 'Could not update comment',
        type: 'error',
      });
    },
    onSuccess: (_data, vars) => {
      // re-fetch transaction detail containing comment
      qc.getQueryCache()
        .findAll()
        .forEach((q: any) => {
          const k = q.queryKey as any[];
          if (k?.[0] === 'transaction') qc.invalidateQueries({ queryKey: k });
        });
      addToast({ title: 'Comment updated', message: 'Saved', type: 'success' });
    },
  });
}

export function useDeleteTransactionComment() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation<any, any, { commentId: string }>({
    mutationFn: async ({ commentId }) =>
      await fetchRPC(rpc.delete_transaction_comment, { p_comment_id: commentId }),
    onMutate: async ({ commentId }) => {
      const snapshots: Record<string, any> = {};
      qc.getQueryCache()
        .findAll()
        .forEach((q: any) => {
          const key = q.queryKey as any[];
          if (key?.[0] === 'transaction') {
            const data = qc.getQueryData<any>(key);
            if (
              (data as any)?.data?.comments &&
              data.data.comments.some((c: any) => c.id === commentId)
            ) {
              snapshots[JSON.stringify(key)] = data;
              qc.setQueryData(key, (old: any) => ({
                ...old,
                data: {
                  ...old.data,
                  comments: old.data.comments.filter((c: any) => c.id !== commentId),
                },
              }));
            }
          }
        });
      return { snapshots };
    },
    onError: (err: any, vars: any, context: any) => {
      for (const [k, v] of Object.entries(context?.snapshots ?? {})) {
        try {
          qc.setQueryData(JSON.parse(k), v);
        } catch (e) {
          void e;
        }
      }
      addToast({
        title: 'Delete failed',
        message: (err as any)?.message ?? 'Could not delete comment',
        type: 'error',
      });
    },
    onSuccess: () => {
      qc.getQueryCache()
        .findAll()
        .forEach((q: any) => {
          const k = q.queryKey as any[];
          if (k?.[0] === 'transaction') qc.invalidateQueries({ queryKey: k });
        });
      addToast({ title: 'Comment deleted', message: 'Removed', type: 'success' });
    },
  });
}

export function useUpdateTransactionWithSplits() {
  const qc = useQueryClient();
  const addToast = useSetAtom(addToastAtom);

  return useMutation<any, any, { txId: string; payload: any }>({
    mutationFn: async ({ txId, payload }) =>
      await fetchRPC(rpc.update_group_transaction_with_splits, {
        p_tx_id: txId,
        p_payload: payload,
      }),

    onMutate: async ({ txId, payload }) => {
      // Snapshot detail
      const txKey = QUERY_KEYS.transaction.details(txId);
      const previousTx = qc.getQueryData<any>(txKey);

      // Optimistically update detail
      if ((previousTx as any)?.data) {
        qc.setQueryData(txKey, (old: any) => ({
          ...old,
          data: {
            ...old.data,
            title: payload.title ?? old.data.title,
            amount: payload.amount ?? old.data.amount,
            paidBy: payload.paidBy ?? old.data.paidBy,
            metadata: { ...(old.data.metadata ?? {}), ...(payload.metadata ?? {}) },
            // If splits provided, update participants view (if your detail endpoint maps this)
            participants: Array.isArray(payload.splits)
              ? payload.splits.map((s: any) => ({
                  userId: s.userId,
                  amount: s.amount,
                }))
              : old.data.participants,
          },
        }));
      }

      // Optimistically update any group lists
      const groupKeyCandidates = findGroupTransactionKeys(qc);
      const previousGroupCaches: Record<string, any> = {};
      for (const k of groupKeyCandidates) {
        const prev = qc.getQueryData<any>(k);
        previousGroupCaches[JSON.stringify(k)] = prev;
        if (!prev) continue;
        qc.setQueryData(k, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              transactions: (p.transactions || []).map((t: any) =>
                t.id === txId
                  ? {
                      ...t,
                      title: payload.title ?? t.title,
                      amount: payload.amount ?? t.amount,
                      paidBy: payload.paidBy ?? t.paidBy,
                    }
                  : t
              ),
            })),
          };
        });
      }

      return { previousTx, previousGroupCaches };
    },

    onError: (err: any, vars: any, context: any) => {
      const txKey = QUERY_KEYS.transaction.details(vars.txId);
      if (context?.previousTx) qc.setQueryData(txKey, context.previousTx);
      for (const [k, v] of Object.entries(context?.previousGroupCaches ?? {})) {
        try {
          qc.setQueryData(JSON.parse(k), v);
        } catch (e) {
          void e;
        }
      }
      addToast({
        title: 'Update failed',
        message: err?.message ?? 'Could not update transaction',
        type: 'error',
      });
    },

    onSuccess: (_data, vars) => {
      // Revalidate detail + lists
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transaction.details(vars.txId) });
      qc.getQueryCache()
        .findAll()
        .forEach((q: any) => {
          const k = q.queryKey as any[];
          if (k?.[0] === 'group' && k?.[3] === 'infinite') qc.invalidateQueries({ queryKey: k });
        });
      addToast({ title: 'Transaction updated', message: 'Saved', type: 'success' });
    },
  });
}
