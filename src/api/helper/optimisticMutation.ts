// src/lib/optimisticMutation.ts
import type { QueryKey, UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * A typed, reusable optimistic mutation factory.
 *
 * TData: server response
 * TVariables: variables passed to mutate
 * TContext: context returned from onMutate (for rollback)
 */
export type OptimisticMutateConfig<TData, TVariables, TContext = any> = {
  // actual api call
  mutationFn: (vars: TVariables) => Promise<TData>;

  // key for reading/writing the cache before/after mutation.
  // Could be a single key or an array of keys you want to update/invalidate.
  targetQueryKey?: QueryKey;

  // optional function that returns new cache value given previous cache and the variables
  // Should produce the "optimistic" updated value
  optimisticUpdate?: (params: { previous?: any; variables: TVariables; now?: () => string }) => any;

  // optional list of queryKeys to invalidate after settle
  invalidateQueryKeys?: QueryKey[];

  // optional function to run additional side-effects on onMutate (like updating more than one key)
  extraOnMutate?: (params: {
    qc: ReturnType<typeof useQueryClient>;
    variables: TVariables;
  }) => void;

  // optional way to compute previous snapshot context (default is { previous })
  buildContext?: (params: { previous?: any }) => TContext;
};

type WrapperReturn<TData, TVariables, TContext> = {
  mutate: (vars: TVariables, opts?: any) => void;
  mutateAsync: UseMutateAsyncFunction<TData, Error, TVariables, TContext>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isIdle: boolean;
  error: Error | null;
  reset: () => void;
  _raw: ReturnType<typeof useMutation<TData, Error, TVariables, TContext>>;
};

/**
 * useOptimisticMutation hook: use inside a component (like your previous useAddExpense)
 */
export function useOptimisticMutation<TData, TVariables, TContext = any>(
  config: OptimisticMutateConfig<TData, TVariables, TContext>
): WrapperReturn<TData, TVariables, TContext> {
  const qc = useQueryClient();

  const mutation = useMutation<TData, Error, TVariables, TContext>({
    mutationFn: config.mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches for target key
      if (config.targetQueryKey) {
        await qc.cancelQueries({ queryKey: config.targetQueryKey });
      }

      // Snapshot previous
      const previous = config.targetQueryKey ? qc.getQueryData(config.targetQueryKey) : undefined;

      // Build optimistic value and set
      if (config.targetQueryKey && config.optimisticUpdate) {
        const optimistic = config.optimisticUpdate({
          previous,
          variables,
          now: () => new Date().toISOString(),
        });
        qc.setQueryData(config.targetQueryKey, optimistic);
      }

      // optional extras
      if (config.extraOnMutate) {
        try {
          config.extraOnMutate({ qc, variables });
        } catch (e) {
          // don't let extraOnMutate break mutate
          console.warn('[useOptimisticMutation] extraOnMutate failed', e);
        }
      }

      // return context for rollback
      if (config.buildContext) return config.buildContext({ previous });
      return { previous } as unknown as TContext;
    },
    onError: (err, variables, context: any) => {
      // rollback main key
      if (config.targetQueryKey && context?.previous !== undefined) {
        qc.setQueryData(config.targetQueryKey, context.previous);
      }
    },
    onSettled: () => {
      // invalidate any keys provided
      const keys =
        config.invalidateQueryKeys ?? (config.targetQueryKey ? [config.targetQueryKey] : []);
      keys.forEach((k) => {
        try {
          qc.invalidateQueries({ queryKey: k });
        } catch (e) {
          // ignore
        }
      });
    },
  });

  // robust status handling (handles 'loading' vs 'pending' union differences)
  const rawStatus = (mutation as unknown as { status?: string }).status ?? 'idle';
  const isLoading = rawStatus === 'loading' || rawStatus === 'pending';
  const isError = rawStatus === 'error';
  const isSuccess = rawStatus === 'success';
  const isIdle = rawStatus === 'idle';

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync as UseMutateAsyncFunction<TData, Error, TVariables, TContext>,
    isLoading,
    isError,
    isSuccess,
    isIdle,
    error: (mutation.error ?? null) as Error | null,
    reset: () => mutation.reset(),
    _raw: mutation,
  } as const;
}
