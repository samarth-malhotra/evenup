import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { Group } from '@/features/groups/types';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useSafeMutation } from '@/hooks/useCreateMutation';
import { QUERY_KEYS } from '@/services/helper/queryKeys';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';
import type { SupaError } from '@/services/supabase/supaError';

// Helper to make a temporary group object for optimistic update
function makeTempGroup(inputName: string, userId: string): Group {
  const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nowIso = new Date().toISOString();
  return {
    id: tempId,
    name: inputName,
    avatar_url: null,
    created_by: userId ?? 'unknown',
    simplified: false,
    // status: 'active' as GROUP_STATUS,
    created_at: nowIso,
    updated_at: nowIso,
    // members: [],
    // deleted_at: null,
    // deleted_by: null,
    // reverted_by: null,
  };
}

export async function createGroup(name: string): Promise<Group> {
  return await fetchRPC<Group>(rpc.createGroup, {
    name,
  });
}

type Variables = { name: string; userId: string };
type OptimisticContext = { previous?: Group[]; tempId?: string };

export default function useCreateGroupMutation() {
  const queryClient = useQueryClient();
  const { accessToken } = useAccessToken();

  // mutationFn: performs the API call
  const mutationFn = async ({ name }: Variables) => {
    if (!accessToken) throw new Error('Access token is missing');
    const group = await createGroup(name);
    return group as Group;
  };

  const createGroupMutation = useSafeMutation<Group, SupaError, Variables, OptimisticContext>(
    mutationFn,
    {
      // onMutate returns OptimisticContext
      onMutate: async ({ name, userId }) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.groups.list });

        const previous = queryClient.getQueryData<Group[]>(QUERY_KEYS.groups.list) ?? [];

        const temp = makeTempGroup(name, userId);
        queryClient.setQueryData<Group[] | undefined>(QUERY_KEYS.groups.list, (old) => {
          const arr = old ? [...old] : [];
          return [temp, ...arr];
        });

        router.push(`/groups/${temp.id}`);

        return { previous, tempId: temp.id };
      },

      onSuccess: (data, _variables, context) => {
        // Now `context` is typed as OptimisticContext and has tempId
        if (!context?.tempId) {
          queryClient.setQueryData<Group[] | undefined>(QUERY_KEYS.groups.list, (old) => {
            const arr = old ? [...old] : [];
            if (!arr.some((g) => g.id === data.id)) return [data, ...arr];
            return arr;
          });
          router.replace(`/groups/${data.id}`);
          return;
        }

        queryClient.setQueryData<Group[] | undefined>(QUERY_KEYS.groups.list, (old) => {
          const arr = old ? [...old] : [];
          const idx = arr.findIndex((g) => g.id === context.tempId);
          if (idx >= 0) {
            arr[idx] = data;
            return arr;
          }
          return [data, ...arr];
        });

        router.replace(`/groups/${data.id}`);
      },

      onError: (err, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData<Group[] | undefined>(QUERY_KEYS.groups.list, context.previous);
        }

        Alert.alert('Create group failed', err instanceof Error ? err.message : String(err));

        if (context?.tempId) {
          try {
            router.replace('/groups');
          } catch (e) {
            /* ignore */
          }
        }
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups.list });
      },
    }
  );

  return {
    createGroupMutation,
    createGroup: (opts: Variables) => createGroupMutation.mutateAsync(opts),
    isCreating: (createGroupMutation as any).isPending ?? createGroupMutation.isPending,
  };
}
