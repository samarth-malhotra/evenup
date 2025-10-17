// src/hooks/useGroupMutations.ts
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { USER_STATUS } from '@/constant';
import type { GroupDetails, GroupMember } from '@/features/groups/types';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useSafeMutation } from '@/hooks/useCreateMutation';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { edge } from '@/services/supabase/constant';
import { edgeFunction } from '@/services/supabase/edgeFunctions';
import { SupaError } from '@/services/supabase/supaError';

export type CreateInvitePayload = {
  phone?: string | null;
  email?: string | null;
  contact_name?: string | null;
  invite_channel?: string; // e.g. "whatsapp"
  type?: 'new' | 'existing';
};

export type CreateInviteResult = {
  inviteLink: string;
  friend_profile_id: string;
  invite_token: string;
  invite_sent_at: string;
  invite_expires_at: string;
};

export async function createGroupInvite(
  groupId: string,
  payload: Omit<CreateInvitePayload, 'type'>,
  accessToken: string
): Promise<CreateInviteResult> {
  if (!groupId) throw new SupaError('Missing groupId', 'invalid_args');

  const path = `${edge.addMember}/groups/${encodeURIComponent(groupId)}/invite`;

  // callEdgeFunction enforces the RPCResponse wrapper and returns response.data
  const data = await edgeFunction<CreateInviteResult>(path, {
    method: 'POST',
    body: payload,
    accessToken,
  });

  // callEdgeFunction returns CreateInviteResult or throws — safe to assert
  return data as CreateInviteResult;
}

/**
 * Query-only optimistic updates for group member mutations:
 * - inviteMember: inserts a temporary member object into QUERY_KEYS.groups.details(groupId) and reconciles after server response.
 *
 * NOTE: We intentionally avoid touching local atoms and instead update React Query cache.
 */
export default function useAddMemberMutation() {
  const queryClient = useQueryClient();
  const { accessToken } = useAccessToken();

  /* ------------------ INVITE / ADD MEMBER ------------------ */
  const inviteMutation = useSafeMutation<
    CreateInviteResult, // TData (createGroupInvite result)
    SupaError, // TError
    { groupId: string; payload: CreateInvitePayload }, // TVariables
    {
      previousGroup?: GroupDetails | undefined;
      optimisticMember?: GroupMember;
      groupId?: string;
      payload?: CreateInvitePayload;
    } // TContext
  >(
    // mutationFn
    async ({ groupId, payload }) => {
      if (!accessToken) throw new Error('Access token is missing.');
      const { phone, email, contact_name, invite_channel } = payload;
      return await createGroupInvite(
        groupId,
        { phone, email, contact_name, invite_channel },
        accessToken
      );
    },
    // options
    {
      onMutate: async ({ groupId, payload }) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.groups.details(groupId) });
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.groups.list });
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.friends.list });

        const previousGroup = queryClient.getQueryData<GroupDetails>(
          QUERY_KEYS.groups.details(groupId)
        );

        const optimisticMember: GroupMember = {
          id: `tmp-${Date.now()}-${Math.random()}`,
          name: payload.contact_name ?? 'Unknown',
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
          __optimistic: true,
        } as unknown as GroupMember;

        if (previousGroup) {
          queryClient.setQueryData<GroupDetails>(QUERY_KEYS.groups.details(groupId), (old) => {
            if (!old) return old;
            return { ...old, members: [...(old.members ?? []), optimisticMember] };
          });
        }

        // Return everything we need later via context
        return { previousGroup, optimisticMember, groupId, payload };
      },

      onError: (err: any, _variables: any, context: any) => {
        const gid = context?.groupId ?? _variables?.groupId;
        if (context?.previousGroup) {
          queryClient.setQueryData(
            QUERY_KEYS.groups.details(context.previousGroup.id),
            context.previousGroup
          );
        } else if (context?.optimisticMember && gid) {
          // remove optimistic member by id
          queryClient.setQueryData<GroupDetails>(QUERY_KEYS.groups.details(gid), (old) =>
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
          queryClient.setQueryData<GroupDetails>(QUERY_KEYS.groups.details(gid), (old) => {
            if (!old) return old;
            const filtered = (old.members ?? []).filter(
              (m: GroupMember) => m.id !== context?.optimisticMember?.id
            );
            return { ...old, members: [...filtered, returnedMember as GroupMember] };
          });
        }

        // keep friends cache consistent
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends.list });
      },

      onSettled: (_data, _err, _variables, context) => {
        const gid = context?.groupId ?? _variables?.groupId;
        if (gid) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups.details(gid) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups.list });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends.list });
      },
    }
  );

  return {
    // invite (add) member
    inviteMutation,
    inviteMember: (opts: { groupId: string; payload: any }) => inviteMutation.mutateAsync(opts),
    // convenience flags
    isInviting: inviteMutation.isPending,
  };
}
