// src/hooks/useDeleteGroupMutation.ts
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import type { Group } from '@/features/groups/types';
import { useSafeMutation } from '@/hooks/useCreateMutation';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import type { SupaError } from '@/services/supabase/supaError';

/**
 * Calls Supabase RPC to soft delete a group
 */
async function deleteGroup(groupId: string, userId: string) {
  return await fetchRPC<{ group_id: string }>(rpc.deleteGroup, {
    p_group_id: groupId,
    p_user_id: userId,
  });
}

/**
 * React Query mutation hook for deleting a group
 * - optimistic removal across all groups* queries
 * - snapshots queries for rollback
 */
// useDeleteGroup.ts
export function useDeleteGroup(userId: string) {
  const qc = useQueryClient();
  const router = useRouter();

  return useSafeMutation<
    unknown, // TData (deleteGroup result; change if you have a concrete type)
    SupaError, // TError
    { groupId: string }, // TVariables
    { previous?: Group[] } // TContext
  >(
    // mutationFn
    async ({ groupId }: { groupId: string }) => {
      return await deleteGroup(groupId, userId);
    },

    // options
    {
      onMutate: async ({ groupId }) => {
        await qc.cancelQueries({ queryKey: QUERY_KEYS.groups.list });

        const previous = qc.getQueryData<Group[]>(QUERY_KEYS.groups.list);

        if (previous) {
          qc.setQueryData<Group[]>(QUERY_KEYS.groups.list, (prev) =>
            prev ? prev.filter((g) => g.id !== groupId) : []
          );
        }

        qc.removeQueries({ queryKey: QUERY_KEYS.groups.details(groupId), exact: true });

        // optimistic navigation
        router.replace('/groups');

        return { previous };
      },

      onError: (err, _vars, ctx) => {
        if (ctx?.previous) qc.setQueryData(QUERY_KEYS.groups.list, ctx.previous);
        console.error('Delete failed:', err);
      },

      onSettled: () => {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.groups.list });
      },
    }
  );
}
