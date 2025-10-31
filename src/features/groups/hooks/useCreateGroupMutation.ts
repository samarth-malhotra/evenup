import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { Group } from '@/features/groups/types';
import { useAccessToken } from '@/hooks/useAccessToken';
import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

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

async function createGroup(name: string): Promise<Group> {
  return await fetchRPC<Group>(rpc.createGroup, {
    name,
  });
}

export default function useCreateGroupMutation() {
  const queryClient = useQueryClient();
  const { accessToken } = useAccessToken();

  const createGroupMutation = useMutation({
    mutationFn: ({ name, userId }: { name: string; userId: string }) => {
      if (!accessToken) {
        throw new Error(`Access token is missing`);
      }
      return createGroup(name);
    },

    // optimistic update
    onMutate: async ({ name, userId }) => {
      // cancel ongoing queries for groups
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      // snapshot previous groups
      const previous = queryClient.getQueryData<Group[]>(['groups']) ?? [];

      // make temp group and insert it at top
      const temp = makeTempGroup(name, userId);
      queryClient.setQueryData<Group[] | undefined>(['groups'], (old) => {
        const arr = old ? [...old] : [];
        // insert temp at front
        return [temp, ...arr];
      });

      // navigate immediately to temp group details
      // route assumed: /groups/[id] -> adjust if your path differs
      router.push(`/groups/${temp.id}`);

      // return context for rollback/use in onError/onSettled
      return { previous, tempId: temp.id };
    },

    // on success: replace temp with real item and replace route
    onSuccess: (
      data: Group,
      _variables,
      context: { previous?: Group[]; tempId?: string } | undefined
    ) => {
      if (!context?.tempId) {
        // fallback: just append
        queryClient.setQueryData<Group[] | undefined>(['groups'], (old) => {
          const arr = old ? [...old] : [];
          // ensure no duplicate
          if (!arr.some((g) => g.id === data.id)) return [data, ...arr];
          return arr;
        });
        // navigate to real id
        router.replace(`/groups/${data.id}`);
        return;
      }

      queryClient.setQueryData<Group[] | undefined>(['groups'], (old) => {
        const arr = old ? [...old] : [];

        // try to find temp index
        const idx = arr.findIndex((g) => g.id === context.tempId);
        if (idx >= 0) {
          // replace temp with real
          arr[idx] = data;
          return arr;
        }

        // if temp not found, prepend real
        return [data, ...arr];
      });

      // replace the route (so back button doesn't go to temp id)
      // using replace so user history is clean
      router.replace(`/groups/${data.id}`);
    },

    onError: (err, _variables, context: { previous?: Group[]; tempId?: string } | undefined) => {
      // rollback: restore previous
      if (context?.previous) {
        queryClient.setQueryData(['groups'], context.previous);
      }
      // If current route is temp, try to navigate back to safe page (groups list)
      // or show an error and let user decide. We'll alert and push /groups.
      Alert.alert('Create group failed', err instanceof Error ? err.message : String(err));

      // if user is on temp group page, replace to groups list
      if (context?.tempId) {
        // if current route includes temp id, replace to groups list
        // (expo-router doesn't expose current route path easily, but replace anyway)
        try {
          router.replace('/groups');
        } catch (e) {
          // ignore
        }
      }
    },

    onSettled: () => {
      // Optionally refetch groups to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return {
    createGroupMutation,
    createGroup: (opts: { name: string; userId: string }) => createGroupMutation.mutateAsync(opts),
    isCreating: createGroupMutation.isPending,
  };
}
