// src/hooks/useGroupMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { Alert } from 'react-native';

import { USER_STATUS } from '@/constant';
import { addMemberInGroup } from '@/features/contacts/api/addMemberInGroup';
import { useAccessToken } from '@/hooks/useAccessToken';
import { supabase } from '@/services/supabase';
import { addGroupMemberAtom, groupsAtom, removeGroupMemberAtom } from '@/stores/atoms/groups';

/**
 * Hook that exposes:
 * - deleteMember({ groupId, memberId, removedBy }) -> Promise
 * - inviteMember({ groupId, payload }) -> Promise
 * - mutation states for UI (isLoading flags)
 *
 * This hook uses atoms for local optimistic updates and invalidates the friends/groups caches.
 */
export default function useGroupMutations() {
  const queryClient = useQueryClient();
  const addMember = useSetAtom(addGroupMemberAtom);
  const removeMember = useSetAtom(removeGroupMemberAtom);
  const setGroups = useSetAtom(groupsAtom as any);
  const { accessToken } = useAccessToken();

  // DELETE MEMBER mutation (calls supabase RPC delete_group_member)
  const deleteMemberMutation = useMutation({
    mutationFn: async ({
      groupId,
      memberId,
      removedBy,
    }: {
      groupId: string;
      memberId: string;
      removedBy: string;
    }) => {
      const { data, error } = await supabase.rpc('delete_group_member', {
        p_group_id: groupId,
        p_user_id: memberId,
        p_removed_by: removedBy,
      });
      if (error) throw new Error(error.message ?? 'Failed to delete member');
      return data;
    },
    onMutate: async ({ groupId, memberId }) => {
      // optimistic marking + local groups atom update for instant feedback
      setGroups((prev: any[]) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((g: any) => {
          if (g.id !== groupId) return g;
          const newMembers = (g.members ?? []).filter((m: any) => m.id !== memberId);
          return { ...g, members: newMembers };
        });
      });
      // return context if needed
      return { groupId, memberId };
    },
    onError: (_err, variables) => {
      // revert by refreshing groups
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      Alert.alert('Failed', 'Failed to remove member');
    },
    onSuccess: (_data, variables) => {
      // commit via removeMember atom (keeps other systems in sync)
      removeMember({
        groupId: variables.groupId,
        role: 'member',
        memberId: variables.memberId,
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // INVITE / ADD MEMBER mutation (calls your API wrapper addMemberInGroup)
  const inviteMutation = useMutation({
    mutationFn: async ({ groupId, payload }: { groupId: string; payload: any }) => {
      if (!accessToken) throw new Error('Access token is missing.');
      return await addMemberInGroup(groupId, payload, accessToken);
    },
    onSuccess: (data, variables) => {
      // update local atom with returned friend_profile_id if present
      addMember({
        groupId: variables.groupId,
        payload: {
          id: data.friend_profile_id ?? `${Date.now()}-${Math.random()}`,
          name: variables.payload.contact_name,
          phone_hash: '',
          email_hash: '',
          status: USER_STATUS.ACTIVE,
          account_status:
            variables.payload.type === 'new' ? USER_STATUS.INVITED : USER_STATUS.ACTIVE,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Invite failed';
      Alert.alert('Invite failed', message);
    },
  });

  return {
    // delete member
    deleteMemberMutation,
    deleteMember: (opts: { groupId: string; memberId: string; removedBy: string }) =>
      deleteMemberMutation.mutateAsync(opts),

    // invite (add) member
    inviteMutation,
    inviteMember: (opts: { groupId: string; payload: any }) => inviteMutation.mutateAsync(opts),

    // convenience flags
    isDeleting: deleteMemberMutation.isPending,
    isInviting: inviteMutation.isPending,
  };
}
