// src/hooks/useDeleteGroupMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import type { Group } from '@/features/groups/types';
import { RPCFunctions } from '@/services/supabase/RPCFunctions';
import { supabase } from '@/services/supabase/supabase';

/**
 * Calls Supabase RPC to soft delete a group
 */
async function deleteGroup(groupId: string, userId: string) {
  const { data, error } = await supabase.rpc(RPCFunctions.deleteGroup, {
    group_id: groupId,
    user_id: userId,
  });

  if (error) throw error;
  return data;
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

  return useMutation({
    // 👇 group object is passed here, so we have id + name + avatar for cache removal etc.
    mutationFn: async ({ groupId }: { groupId: string }) => {
      return deleteGroup(groupId, userId);
    },

    onMutate: async ({ groupId }) => {
      await qc.cancelQueries({ queryKey: ['groups', userId] });

      const previous = qc.getQueryData<Group[]>(['groups', userId]);

      if (previous) {
        qc.setQueryData<Group[]>(['groups', userId], (prev) =>
          prev ? prev.filter((g) => g.id !== groupId) : []
        );
      }

      qc.removeQueries({ queryKey: ['group', groupId], exact: true });

      // optimistic navigation
      router.replace('/groups');

      return { previous };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['groups', userId], ctx.previous);
      console.error('Delete failed:', err);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });
}
