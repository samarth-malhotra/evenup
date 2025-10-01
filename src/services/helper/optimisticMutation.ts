// src/lib/useOptimisticMutation.ts
import type { QueryKey, UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { normalizeSupabaseError } from '@/services/helper/errors';

/**
 * Configuration for useOptimisticMutation
 *
 * TData: server response type
 * TVariables: variables passed to mutate
 * TContext: optional context returned from onMutate (for rollback)
 *
 * - mutationFn: actual async call to server
 * - targetQueryKey: a single QueryKey or array of QueryKeys to optimistically update / cancel
 * - optimisticUpdate: transforms previous cached value into optimistic value (should be pure)
 * - invalidateQueryKeys: QueryKeys to invalidate after mutation settles (unless replaced in place)
 * - extraOnMutate: optional side-effects in onMutate (runs after optimisticUpdate)
 * - buildContext: optional function to build context returned to onError/onSettled
 * - replaceOnSuccess: optional function called in onSuccess to replace optimistic items in-place
 * - onAuthError: optional callback called when an auth-type PostgREST error occurs (PGRST301/302/401)
 * - throwOnAuthError: if true, auth-errors will be thrown instead of being intercepted (default false)
 */
export type OptimisticMutateConfig<TData, TVariables, TContext = any> = {
  mutationFn: (vars: TVariables) => Promise<TData>;
  targetQueryKey?: QueryKey | QueryKey[];
  optimisticUpdate?: (params: { previous?: any; variables: TVariables; now?: () => string }) => any;
  invalidateQueryKeys?: QueryKey[];
  extraOnMutate?: (params: {
    qc: ReturnType<typeof useQueryClient>;
    variables: TVariables;
  }) => void;
  buildContext?: (params: { previous?: any }) => TContext;
  replaceOnSuccess?: (params: {
    data: TData;
    variables: TVariables;
    qc: ReturnType<typeof useQueryClient>;
  }) => void;

  // New: auth handling hooks
  onAuthError?: () => void;
  throwOnAuthError?: boolean;
};

/**
 * Return shape of the hook — a thin wrapper around useMutation
 */
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

/** utility to normalize input keys into QueryKey[] */
function normalizeKeys(k?: QueryKey | QueryKey[]): QueryKey[] {
  if (!k) return [];
  if (Array.isArray(k) && k.length && Array.isArray(k[0])) return k as QueryKey[];
  return Array.isArray(k) ? ([k] as QueryKey[]) : [k];
}

/** Internal helper: inspect PostgREST-style error and decide handling */
function handlePostgrestError(
  err: any,
  opts?: { onAuthError?: () => void; throwOnAuthError?: boolean }
) {
  // guard: if not a Postgrest-like error, rethrow
  const code = err?.code ?? err?.status ?? null;
  // If there's no code, treat as generic
  if (!code || typeof code !== 'string') {
    return {
      handled: false,
      normalized: { type: 'other', message: String(err), original: err } as any,
    };
  }

  // use your existing normalize helper
  const normalized = normalizeSupabaseError(err);

  if (normalized.type === 'not_found') {
    // for mutations we typically resolve to null and let caller decide
    return { handled: true, result: null as any };
  }

  if (normalized.type === 'auth_error') {
    if (!opts?.throwOnAuthError) {
      if (opts?.onAuthError) {
        try {
          opts.onAuthError();
        } catch (e) {
          console.warn('onAuthError threw', e);
        }
      }
      return { handled: true, result: null as any };
    }
    return { handled: false, normalized };
  }

  return { handled: false, normalized };
}

/**
 * useOptimisticMutation
 *
 * Wraps react-query's useMutation adding:
 *  - optimistic cache updates (setQueryData)
 *  - rollback on error using snapshots
 *  - optional in-place replacement on success (replaceOnSuccess)
 *  - optional invalidation of keys onSettled
 *  - centralized PostgREST error handling (not_found / auth errors)
 */
export function useOptimisticMutation<TData, TVariables, TContext = any>(
  config: OptimisticMutateConfig<TData, TVariables, TContext>
): WrapperReturn<TData, TVariables, TContext> {
  const qc = useQueryClient();
  const keys = normalizeKeys(config.targetQueryKey);

  // Wrap the user's mutationFn so we apply normalized PostgREST error policy
  const wrappedMutationFn = async (vars: TVariables) => {
    try {
      return await config.mutationFn(vars);
    } catch (err: any) {
      const decision = handlePostgrestError(err, {
        onAuthError: config.onAuthError,
        throwOnAuthError: config.throwOnAuthError,
      });

      if (decision.handled) {
        // resolve to null for handled cases (e.g., not_found or handled auth)
        return decision.result as TData;
      }

      // Not handled -> throw normalized Error so react-query treats as error
      const message = decision.normalized?.message ?? String(err);
      const e = new Error(message);
      (e as any).original = decision.normalized?.original ?? err;
      throw e;
    }
  };

  const mutation = useMutation<TData, Error, TVariables, TContext>({
    mutationFn: wrappedMutationFn,

    onMutate: async (variables) => {
      // cancel outgoing queries for all keys to avoid race conditions
      await Promise.all(keys.map((k) => qc.cancelQueries({ queryKey: k })));

      // snapshot previous
      const previousMap = new Map<string, any>();
      keys.forEach((k) => previousMap.set(JSON.stringify(k), qc.getQueryData(k)));

      // optimistic update
      const optimisticUpdate = config.optimisticUpdate;
      if (optimisticUpdate) {
        keys.forEach((k) => {
          try {
            const prev = qc.getQueryData(k);
            const optimistic = optimisticUpdate({
              previous: prev,
              variables,
              now: () => new Date().toISOString(),
            });
            qc.setQueryData(k, optimistic);
          } catch (e) {
            console.warn('[useOptimisticMutation] optimisticUpdate failed for key', k, e);
          }
        });
      }

      // extra onMutate side-effects
      if (config.extraOnMutate) {
        try {
          config.extraOnMutate({ qc, variables });
        } catch (e) {
          console.warn('[useOptimisticMutation] extraOnMutate failed', e);
        }
      }

      if (config.buildContext) return config.buildContext({ previous: previousMap });
      return { previousMap } as unknown as TContext;
    },

    onError: (_err, _vars, context: any) => {
      try {
        if (context?.previousMap) {
          keys.forEach((k) => {
            const snap = context.previousMap.get(JSON.stringify(k));
            if (snap !== undefined) qc.setQueryData(k, snap);
          });
        }
      } catch (e) {
        console.warn('[useOptimisticMutation] onError rollback failed', e);
      }
    },

    onSuccess: (data, variables) => {
      const replaceOnSuccess = config.replaceOnSuccess;
      if (replaceOnSuccess) {
        try {
          replaceOnSuccess({ data, variables, qc });
          return;
        } catch (e) {
          console.warn('[useOptimisticMutation] replaceOnSuccess failed', e);
        }
      }
      // otherwise leave to onSettled to invalidate
    },

    onSettled: () => {
      const toInvalidate = config.invalidateQueryKeys ?? keys;
      toInvalidate.forEach((k) => {
        try {
          qc.invalidateQueries({ queryKey: k });
        } catch (e) {
          // ignore best-effort invalidation failures
        }
      });
    },
  });

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
