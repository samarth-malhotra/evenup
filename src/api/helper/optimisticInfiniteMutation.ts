// src/lib/optimisticInfiniteMutation.ts
import type { InfiniteData, QueryKey, UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  makePrependSimpleItem,
  prependToFirstPage,
  removeOptimisticFromPages,
  replaceOptimisticInPages,
} from '@/api/helper/infiniteHelpers';

/**
 * Config:
 * - mutationFn: actual API call
 * - infiniteQueryKey: the queryKey used for useInfiniteQuery (tuple)
 * - createOptimisticItem: given variables -> optimistic item to insert
 * - findOptimisticPredicate: given variables/item -> boolean to identify optimistic item for rollback/removal
 * - onServerResponseReplace?: optional function to merge server response with optimistic item (replace by id)
 */
export function useOptimisticInfiniteMutation<
  TItem extends { id?: string },
  TVars,
  TResp = TItem,
>(config: {
  mutationFn: (vars: TVars) => Promise<TResp>;
  infiniteQueryKey: QueryKey;
  // build optimistic item to insert into first page (must be TItem)
  createOptimisticItem: (vars: TVars) => TItem;
  // predicate to find optimistic item(s) in pages
  isOptimistic?: (item: TItem, vars?: TVars) => boolean;
  // optional: map server response TResp -> TItem to replace optimistic item
  mapServerToItem?: (resp: TResp) => TItem;
}) {
  const qc = useQueryClient();

  const mutation = useMutation<TResp, Error, TVars>({
    mutationFn: config.mutationFn,
    onMutate: async (vars) => {
      const optimistic = config.createOptimisticItem(vars);
      const isOptimistic =
        config.isOptimistic ?? ((it: TItem) => it.id?.toString().startsWith('optimistic-'));

      // cancel outgoing refetches for infinite query
      await qc.cancelQueries({ queryKey: config.infiniteQueryKey });

      // snapshot previous infinite data
      const previous = qc.getQueryData<InfiniteData<TItem[]>>(config.infiniteQueryKey);

      // set optimistic pages: prepend to first page
      const newData = prependToFirstPage(
        previous as InfiniteData<TItem[]> | undefined,
        makePrependSimpleItem<TItem>(optimistic)
      );
      qc.setQueryData<InfiniteData<TItem[]>>(config.infiniteQueryKey, newData as any);

      return { previous, optimisticId: optimistic.id };
    },

    onError: (err, vars, context: any) => {
      // rollback: restore previous full infinite data
      if (context?.previous) {
        qc.setQueryData(config.infiniteQueryKey, context.previous);
      } else if (context?.optimisticId) {
        // fallback: remove optimistic item by id
        qc.setQueryData(config.infiniteQueryKey, (prev: any) =>
          removeOptimisticFromPages(
            prev as InfiniteData<TItem[]> | undefined,
            (it) => it.id === context.optimisticId
          )
        );
      }
    },

    onSuccess: (resp, vars, context: any) => {
      // replace optimistic item id with server canonical item, if mapServerToItem provided
      const serverItem = config.mapServerToItem
        ? config.mapServerToItem(resp)
        : (resp as unknown as TItem);
      if (context?.optimisticId && serverItem) {
        qc.setQueryData(config.infiniteQueryKey, (prev: InfiniteData<TItem[]> | undefined) =>
          replaceOptimisticInPages(
            prev as InfiniteData<TItem[]> | undefined,
            context.optimisticId,
            serverItem
          )
        );
      }
    },

    onSettled: () => {
      // re-fetch to ensure server canonical state (optional)
      qc.invalidateQueries({ queryKey: config.infiniteQueryKey });
    },
  });

  // stable wrapper
  const rawStatus = (mutation as unknown as { status?: string }).status ?? 'idle';
  const isLoading = rawStatus === 'loading' || rawStatus === 'pending';
  const isError = rawStatus === 'error';
  const isSuccess = rawStatus === 'success';
  const isIdle = rawStatus === 'idle';

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync as UseMutateAsyncFunction<TResp, Error, TVars, unknown>,
    isLoading,
    isError,
    isSuccess,
    isIdle,
    error: mutation.error ?? null,
    reset: () => mutation.reset(),
    _raw: mutation,
  } as const;
}
