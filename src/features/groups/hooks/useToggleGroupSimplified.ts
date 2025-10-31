// src/hooks/useToggleGroupSimplified.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import type { SupaError } from '@/services/supabase/supaError';

type TogglePayload = { groupId: string; simplified: boolean };
type ToggleResult = { id: string; simplified: boolean; updated_at?: string } | null;

// mutation context carries the previous cache value so we can rollback
type MutationContext = { previous?: unknown };

async function toggleGroupSimplifiedRPC(
  groupId: string,
  simplified: boolean
): Promise<ToggleResult> {
  return await fetchRPC<ToggleResult>(rpc.toggleGroupSimplified, {
    p_group_id: groupId,
    p_simplified: simplified,
  });
}

/**
 * Hook to toggle the group's `simplified` flag.
 * Optimistic update: updates ['group', groupId] query cache.
 */
export function useToggleGroupSimplified() {
  const qc = useQueryClient();

  return useMutation<ToggleResult, SupaError, TogglePayload, MutationContext>({
    mutationFn: ({ groupId, simplified }) => toggleGroupSimplifiedRPC(groupId, simplified),

    onMutate: async ({ groupId, simplified }) => {
      // cancel in-flight queries for this group
      await qc.cancelQueries({ queryKey: ['group', groupId] });

      // snapshot previous value
      const previous = qc.getQueryData<any>(['group', groupId]);

      // optimistic update: set simplified to requested value; keep existing arrays until server returns
      qc.setQueryData(['group', groupId], (old: any) => {
        if (!old) return old;
        const next = {
          ...old,
          simplified: simplified,
          data: {
            ...old.data,
            simplified: simplified,
            simplified_settlements: simplified ? (old.data?.simplified_settlements ?? []) : [],
            net_balances: simplified ? (old.data?.net_balances ?? []) : [],
          },
        };
        return next;
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      // rollback using typed context
      if (context?.previous) {
        qc.setQueryData(['group', variables.groupId], context.previous);
      }
      // optionally surface error elsewhere
    },

    onSettled: (_data, _err, variables, _context) => {
      // Use the object overload so TS picks correct signature
      if (variables?.groupId) {
        qc.invalidateQueries({ queryKey: ['group', variables.groupId] });
      }
      qc.invalidateQueries({ queryKey: ['groups'] }); // refresh groups list
    },
  });
}
