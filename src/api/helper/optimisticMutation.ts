// src/lib/useOptimisticMutation.ts
import type { QueryKey, UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

/**
 * Normalize input which can be a single QueryKey or an array of QueryKeys.
 * Ensures we always work with QueryKey[] internally.
 *
 * @param k - QueryKey | QueryKey[] | undefined
 * @returns QueryKey[]
 */
function normalizeKeys(k?: QueryKey | QueryKey[]): QueryKey[] {
  if (!k) return [];
  // if it's an array-of-keys (each key itself may be an array), return as-is
  if (Array.isArray(k) && k.length && Array.isArray(k[0])) return k as QueryKey[];
  // otherwise treat single key as [k]
  return Array.isArray(k) ? ([k] as QueryKey[]) : [k];
}

/**
 * useOptimisticMutation
 *
 * A reusable hook that wraps react-query's useMutation and provides:
 *  - optimistic cache updates (setQueryData)
 *  - rollback on error using snapshots
 *  - optional in-place replacement on success (replaceOnSuccess)
 *  - optional invalidation of keys onSettled
 *
 * Example usage:
 * ```ts
 * // optimistic add to a list
 * const createGroup = useOptimisticMutation<Group, CreateGroupPayload>({
 *   mutationFn: api.createGroup,
 *   targetQueryKey: QUERY_KEYS.groups.list,
 *   optimisticUpdate: ({ previous, variables }) => {
 *     const tmp = { id: `tmp-${Date.now()}`, name: variables.name, created_at: new Date().toISOString() };
 *     return [tmp, ...(previous ?? [])];
 *   },
 *   replaceOnSuccess: ({ data, variables, qc }) => {
 *     // find tmp by some clientTempId that you passed in variables and replace with server object
 *     qc.setQueryData(QUERY_KEYS.groups.list, (prev: any[] = []) => {
 *       const i = prev.findIndex(p => p.id === variables.__clientTempId);
 *       if (i === -1) return [data, ...prev];
 *       const copy = [...prev]; copy[i] = data; return copy;
 *     });
 *   },
 *   invalidateQueryKeys: [], // optional — empty when using replaceOnSuccess
 * });
 * ```
 *
 * @param config - OptimisticMutateConfig<TData, TVariables, TContext>
 * @returns WrapperReturn<TData, TVariables, TContext>
 */
export function useOptimisticMutation<TData, TVariables, TContext = any>(
  config: OptimisticMutateConfig<TData, TVariables, TContext>
): WrapperReturn<TData, TVariables, TContext> {
  const qc = useQueryClient();
  const keys = normalizeKeys(config.targetQueryKey);

  const mutation = useMutation<TData, Error, TVariables, TContext>({
    mutationFn: config.mutationFn,

    /**
     * onMutate: run before mutationFn
     * - cancels queries for the target keys
     * - snapshots previous cache values into previousMap
     * - runs optimisticUpdate (if provided) to set optimistic cache
     * - runs extraOnMutate (if provided)
     * - returns context for rollback (either custom via buildContext or default { previousMap })
     */
    onMutate: async (variables) => {
      // cancel outgoing for all keys to avoid race conditions
      await Promise.all(keys.map((k) => qc.cancelQueries({ queryKey: k })));

      // snapshot previous
      const previousMap = new Map<string, any>();
      keys.forEach((k) => previousMap.set(JSON.stringify(k), qc.getQueryData(k)));

      // Narrow optimisticUpdate to a local const so TypeScript knows it won't change mid-loop
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
            // don't let optimisticUpdate errors break the mutate flow
            console.warn('[useOptimisticMutation] optimisticUpdate failed for key', k, e);
          }
        });
      }

      const extraOnMutate = config.extraOnMutate;
      if (extraOnMutate) {
        try {
          extraOnMutate({ qc, variables });
        } catch (e) {
          console.warn('[useOptimisticMutation] extraOnMutate failed', e);
        }
      }

      if (config.buildContext) return config.buildContext({ previous: previousMap });
      return { previousMap } as unknown as TContext;
    },

    /**
     * onError: rollback using the snapshot in context (if available).
     * The context shape is whatever buildContext returned, or { previousMap } by default.
     */
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

    /**
     * onSuccess:
     * - if replaceOnSuccess is provided, call it to perform an exact in-place replacement
     * - if replaceOnSuccess throws, we fallthrough to onSettled (which may invalidate)
     */
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
      // otherwise do nothing here — onSettled will handle invalidation
    },

    /**
     * onSettled:
     * - best-effort invalidation of configured keys (or the target keys if none configured)
     * - keep this minimal to avoid extra network calls if replaceOnSuccess already patched cache
     */
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

  // normalize mutation status to simple booleans
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

/**
 * ---------------------------
 * Quick usage examples
 * ---------------------------
 *
 * 1) Optimistic add (prepend) and invalidate on settle:
 *
 * const addItem = useOptimisticMutation<Item, { text: string }>({
 *   mutationFn: api.addItem,
 *   targetQueryKey: ['items', 'list'],
 *   optimisticUpdate: ({ previous, variables }) => {
 *     const tmp = { id: `tmp-${Date.now()}`, text: variables.text, _optimistic: true };
 *     return [tmp, ...(previous ?? [])];
 *   },
 *   invalidateQueryKeys: [['items','list']],
 * });
 *
 * addItem.mutate({ text: 'Buy milk' });
 *
 * 2) Optimistic add with exact replaceOnSuccess using clientTempId:
 *
 * // In component generate clientTempId and include it in variables.__clientTempId
 * const clientTempId = makeClientTempId();
 *
 * const create = useOptimisticMutation<Item, {text: string; __clientTempId?: string}>({
 *   mutationFn: async (vars) => {
 *     const { __clientTempId, ...serverPayload } = vars;
 *     return api.createItem(serverPayload); // returns server item with real id
 *   },
 *   targetQueryKey: ['items','list'],
 *   optimisticUpdate: ({ previous, variables }) => {
 *     const tmp = { id: variables.__clientTempId, text: variables.text, __clientTempId: variables.__clientTempId };
 *     return [tmp, ...(previous ?? [])];
 *   },
 *   replaceOnSuccess: ({ data, variables, qc }) => {
 *     qc.setQueryData(['items','list'], (prev: any[] = []) => {
 *       const idx = prev.findIndex(p => p.__clientTempId === variables.__clientTempId);
 *       if (idx === -1) return [data, ...prev];
 *       const copy = [...prev]; copy[idx] = data; return copy;
 *     });
 *   },
 *   invalidateQueryKeys: [], // handled by replaceOnSuccess
 * });
 *
 * create.mutate({ text: 'Trip to Goa', __clientTempId: clientTempId });
 *
 * ---------------------------
 * End of examples
 * ---------------------------
 */
