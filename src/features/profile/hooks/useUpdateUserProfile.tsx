import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { APP_MODE } from '@/constant';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import type { SupaError } from '@/services/supabase/supaError';
import type { User } from '@/types';

type MutateResult = User;

type UpdateUserProfilePayload = {
  userId: string;
  nickname?: string;
  theme?: APP_MODE;
};

export async function updateUserProfile(payload: UpdateUserProfilePayload): Promise<User> {
  const { userId, nickname, theme } = payload;
  return await fetchRPC<User>(rpc.updateUserProfile, {
    p_user_id: userId,
    ...(nickname ? { p_nickname: nickname } : {}),
    ...(theme ? { p_theme: theme } : {}),
  });
}

export function useUpdateUserProfile(): UseMutationResult<
  MutateResult,
  SupaError,
  UpdateUserProfilePayload,
  { previousUser?: User | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation<
    MutateResult,
    SupaError,
    UpdateUserProfilePayload,
    { previousUser?: User | undefined }
  >({
    mutationFn: async (payload: UpdateUserProfilePayload) => {
      return await updateUserProfile(payload);
    },

    onMutate: async (payload) => {
      const { userId, nickname, theme } = payload;
      const key = QUERY_KEYS.userProfile(userId);

      await queryClient.cancelQueries({ queryKey: key });

      const previousUser = queryClient.getQueryData<User | undefined>(key);

      const optimistic: User = previousUser
        ? {
            ...previousUser,
            nickname: nickname === undefined ? previousUser.nickname : nickname,
            theme: theme === undefined ? previousUser.theme : theme,
            updated_at: new Date().toISOString(),
          }
        : ({
            id: userId,
            nickname: nickname ?? null,
            theme: theme ?? null,
            updated_at: new Date().toISOString(),
          } as User);

      queryClient.setQueryData<User>(key, optimistic);

      return { previousUser };
    },

    onError: (err, variables, context) => {
      const key = QUERY_KEYS.userProfile(variables.userId);
      if (context?.previousUser) {
        queryClient.setQueryData<User>(key, context.previousUser);
      } else {
        // If there was no previous user, remove placeholder so it doesn't look valid
        queryClient.removeQueries({ queryKey: key, exact: true });
      }
      console.error('[updateUserProfile] onError - rollback', { err, variables, context });
    },

    // NOTE: data may be either a User object or an envelope { user: User } — handle both
    onSuccess: (data, variables) => {
      const key = QUERY_KEYS.userProfile(variables.userId);

      // defensive: figure out actual user object returned
      const resolvedUser: User | undefined =
        data && typeof data === 'object'
          ? // if rpc returns { user: {...} } or { id, nickname, ... }
            'user' in (data as any)
            ? (data as any).user
            : (data as any)
          : undefined;

      if (!resolvedUser || !resolvedUser.id) {
        // Unexpected server response — keep the optimistic value, do not nuke the canonical key
        console.warn('[updateUserProfile] unexpected server response', { data, variables });
        // Optionally setQueryData to ensure canonical shape:
        queryClient.setQueryData<Partial<User>>(key, (old) => ({
          ...old,
          id: variables.userId,
          nickname: resolvedUser?.nickname ?? old?.nickname ?? '',
          theme: resolvedUser?.theme ?? old?.theme ?? APP_MODE.LIGHT,
          updated_at: new Date().toISOString(),
        }));
        return;
      }

      // Replace the canonical cache using the variables.userId key (not data.id)
      queryClient.setQueryData<User>(key, resolvedUser);
      console.log('[updateUserProfile] onSuccess - cache set', { key, resolvedUser });
    },

    onSettled: (data, error, variables) => {
      const key = QUERY_KEYS.userProfile(variables.userId);
      // Prefer NOT to invalidate by default (can cause refetch / races that trigger redirects).
      // If you want background reconciliation, uncomment the next line but be mindful.
      // queryClient.invalidateQueries({ queryKey: key });
      console.log('[updateUserProfile] onSettled', { key, error });
    },

    retry: (failureCount, error) => {
      if ((error as SupaError)?.code === 'supabase_error' && failureCount < 2) return true;
      return false;
    },
  });
}
