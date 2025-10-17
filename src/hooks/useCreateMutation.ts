// src/lib/useSafeMutation.ts
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import { SupaError } from '@/services/supabase/supaError';

/**
 * Default mutation config you want applied globally.
 * Adjust retry/backoff logic to taste.
 */
const DEFAULT_MUTATION_CONFIG = {
  // don't retry by default for application-level errors; network retries can be enabled if desired
  retry: (failureCount: number, error: unknown) => {
    if ((error as SupaError)?.code === 'supabase_error' && failureCount < 1) return true;
    return false;
  },
} as const;

/**
 * useSafeMutation
 * - Wrapper around useMutation to centralize try/catch + error normalization
 * - Callers pass a `mutationFn` as the first param (so the `options` object cannot override it)
 * - `options` can't include `mutationFn` (we own it)
 */
export function useSafeMutation<
  TData = unknown,
  TError = SupaError,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
): UseMutationResult<TData, TError, TVariables, TContext> {
  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables);
      } catch (err) {
        if (err instanceof SupaError) {
          throw err as unknown as TError;
        }
        // wrap unknown errors
        throw new SupaError(
          (err as Error)?.message ?? 'Unknown error',
          'unknown'
        ) as unknown as TError;
      }
    },
    ...DEFAULT_MUTATION_CONFIG,
    ...options,
  });
}
