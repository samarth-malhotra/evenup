// src/lib/useSafeQuery.ts
import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { SupaError } from '@/services/supabase/supaError';

// Default config - tweak as needed
const DEFAULT_CONFIG = {
  staleTime: 1000 * 60 * 5,
  retry: (failureCount: number, error: unknown) => {
    if ((error as SupaError)?.code === 'supabase_error' && failureCount < 2) return true;
    return false;
  },
} as const;

/**
 * useSafeQuery
 * - Accepts a QueryKey and a fetcher
 * - Caller-provided options cannot include `queryKey` (we own it)
 * - Wraps queryFn in try/catch and normalizes errors
 */
export function useSafeQuery<TQueryFnData, TError = SupaError, TData = TQueryFnData>(
  queryKey: QueryKey,
  fetcher: () => Promise<TQueryFnData>,
  // prevent callers from accidentally passing queryKey inside options
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, QueryKey>, 'queryKey'>
): UseQueryResult<TData, TError> {
  return useQuery<TQueryFnData, TError, TData, QueryKey>({
    queryKey,
    queryFn: async () => {
      try {
        return await fetcher();
      } catch (err) {
        if (err instanceof SupaError) {
          // preserve SupaError shape
          throw err as unknown as TError;
        }
        // wrap unknown errors
        throw new SupaError(
          (err as Error)?.message ?? 'Unknown error',
          'unknown'
        ) as unknown as TError;
      }
    },
    ...DEFAULT_CONFIG,
    ...options, // safe: options can't include queryKey
  });
}
