// src/hooks/useGroupMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { USER_STATUS } from '@/constant';
import { addMemberInGroup } from '@/features/contacts/api/addMemberInGroup';
import type { GroupDetails, GroupMember } from '@/features/groups/types';
import { useAccessToken } from '@/hooks/useAccessToken';

/**
 * Query-only optimistic updates for group member mutations:
 * - inviteMember: inserts a temporary member object into ['group', groupId] and reconciles after server response.
 *
 * NOTE: We intentionally avoid touching local atoms and instead update React Query cache.
 */
export default function useAddMemberMutation() {
  const queryClient = useQueryClient();
  const { accessToken } = useAccessToken();

  /* ------------------ INVITE / ADD MEMBER ------------------ */
  const inviteMutation = useMutation({
    mutationFn: async ({ groupId, payload }: { groupId: string; payload: any }) => {
      if (!accessToken) throw new Error('Access token is missing.');
      return await addMemberInGroup(groupId, payload, accessToken);
    },

    onMutate: async ({ groupId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });
      await queryClient.cancelQueries({ queryKey: ['friends'] });

      const previousGroup = queryClient.getQueryData<GroupDetails>(['group', groupId]);

      const optimisticMember: GroupMember = {
        id: `tmp-${Date.now()}-${Math.random()}`,
        name: payload.contact_name ?? payload.name ?? 'Unknown',
        phone_hash: '',
        email_hash: '',
        status_in_group: USER_STATUS.ACTIVE,
        account_status: payload.type === 'new' ? USER_STATUS.INVITED : USER_STATUS.ACTIVE,
        role: 'member',
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        avatar_url: null,
        currency: '',
        language: '',
      } as unknown as GroupMember;

      if (previousGroup) {
        queryClient.setQueryData<GroupDetails>(['group', groupId], (old) => {
          if (!old) return old;
          return { ...old, members: [...(old.members ?? []), optimisticMember] };
        });
      }

      // Return everything we need later via context (do NOT rely on `variables` there)
      return { previousGroup, optimisticMember, groupId, payload };
    },

    onError: (err: any, _variables: any, context: any) => {
      // Prefer context.groupId (returned from onMutate). Fallback to _variables?.groupId.
      const gid = context?.groupId ?? _variables?.groupId;
      if (context?.previousGroup) {
        queryClient.setQueryData(['group', context.previousGroup.id], context.previousGroup);
      } else if (context?.optimisticMember && gid) {
        // remove optimistic member by id
        queryClient.setQueryData<GroupDetails>(['group', gid], (old) =>
          old
            ? {
                ...old,
                members: (old.members ?? []).filter((m) => m.id !== context.optimisticMember.id),
              }
            : old
        );
      }

      const message = err?.response?.data?.message || err?.message || 'Invite failed';
      Alert.alert('Invite failed', message);
      console.error('inviteMember error', err, { context, variables: _variables });
    },

    onSuccess: (data: any, _variables: any, context: any) => {
      // Use returned data if it has the canonical member; otherwise rely on invalidate to reconcile.
      const gid = context?.groupId ?? _variables?.groupId;
      const returnedMember =
        data?.friend_profile ??
        (data?.friend_profile_id
          ? {
              id: data.friend_profile_id,
              name: context?.payload?.contact_name ?? context?.payload?.name,
            }
          : null);

      if (returnedMember && gid) {
        // Replace optimistic member by matching either tmp id or name (best-effort)
        queryClient.setQueryData<GroupDetails>(['group', gid], (old) => {
          if (!old) return old;
          // remove the optimistic member (match by tmp id if present)
          const filtered = (old.members ?? []).filter(
            (m: GroupMember) => m.id !== context?.optimisticMember?.id
          );
          return { ...old, members: [...filtered, returnedMember as GroupMember] };
        });
      }

      // keep friends cache consistent
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },

    onSettled: (_data, _err, _variables, context) => {
      const gid = context?.groupId ?? _variables?.groupId;
      if (gid) queryClient.invalidateQueries({ queryKey: ['group', gid] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  return {
    // invite (add) member
    inviteMutation,
    inviteMember: (opts: { groupId: string; payload: any }) => inviteMutation.mutateAsync(opts),
    // convenience flags
    isInviting: inviteMutation.isPending,
  };
}
