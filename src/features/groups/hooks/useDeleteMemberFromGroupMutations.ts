// src/hooks/useGroupMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import type { GroupDetails } from '@/features/groups/types';
import { supabase } from '@/services/supabase';

/**
 * Query-only optimistic updates for group member mutations:
 * - deleteMember: removes a member from ['group', groupId].rolls back on error.
 *
 * NOTE: We intentionally avoid touching local atoms and instead update React Query cache.
 */
export default function useDeleteMemberMutation() {
  const queryClient = useQueryClient();

  /* ------------------ DELETE MEMBER ------------------ */
  // types used in this snippet (import them from your types file)
  type DeleteVars = {
    groupId: string;
    memberId: string;
    removedBy: string;
  };
  type DeleteContext = {
    previousGroup?: GroupDetails | null;
    groupId: string;
    memberId: string;
  };

  const deleteMemberMutation = useMutation<unknown, Error, DeleteVars, DeleteContext>({
    mutationFn: async ({ groupId, memberId, removedBy }: DeleteVars) => {
      const { data, error } = await supabase.rpc('delete_group_member', {
        p_group_id: groupId,
        p_user_id: memberId,
        p_removed_by: removedBy,
      });
      if (error) {
        throw new Error(
          error.message ?? `Failed to ${memberId === removedBy ? 'leave group' : 'delete member'}`
        );
      }
      return data;
    },

    // onMutate MUST return the context we'll use later
    onMutate: async ({ groupId, memberId }: DeleteVars) => {
      // cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });
      await queryClient.cancelQueries({ queryKey: ['friends'] });

      // snapshot previous group detail
      const previousGroup = queryClient.getQueryData<GroupDetails>(['group', groupId]) ?? null;

      // optimistic update: remove member from members array
      if (previousGroup) {
        queryClient.setQueryData<GroupDetails>(['group', groupId], (old) => {
          if (!old) return old;
          return {
            ...old,
            members: (old.members ?? []).filter((m) => m.id !== memberId),
          };
        });
      }

      // return context for rollback / later callbacks
      return { previousGroup, groupId, memberId };
    },

    // Prefer context over variables (variables may be null in some codepaths)
    onError: (
      err: Error,
      _variables: DeleteVars | undefined,
      context: DeleteContext | undefined
    ) => {
      const ctx = context;
      if (ctx?.previousGroup) {
        // restore the full previous snapshot
        queryClient.setQueryData(['group', ctx.previousGroup.id], ctx.previousGroup);
      } else if (ctx?.groupId && ctx?.memberId) {
        // best-effort: remove any partial optimistic state or re-fetch
        queryClient.invalidateQueries({ queryKey: ['group', ctx.groupId] });
      } else {
        // ultimate fallback: refresh lists
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      }

      // notify
      Alert.alert('Failed', 'Failed to remove member.');
      console.error('deleteMember error', err, { context });
    },

    onSuccess: (_data, _variables, context) => {
      // we already applied optimistic update; optionally do further local commits
      // e.g., we could emit analytics or update friends cache
      if (context?.groupId) {
        queryClient.invalidateQueries({ queryKey: ['friends'] });
      }
    },

    onSettled: (_data, _err, _variables, context) => {
      // use context.groupId if available to invalidate the right keys
      const gid = context?.groupId;
      if (gid) {
        queryClient.invalidateQueries({ queryKey: ['group', gid] });
      }
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  return {
    // delete member
    deleteMemberMutation,
    deleteMember: (opts: { groupId: string; memberId: string; removedBy: string }) =>
      deleteMemberMutation.mutateAsync(opts),

    // convenience flags
    isDeleting: deleteMemberMutation.isPending,
  };
}
