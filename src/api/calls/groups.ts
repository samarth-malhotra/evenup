// src/features/groups.ts
import { useOptimisticMutation } from '@/api/helper/optimisticMutation';
import { QUERY_KEYS } from '@/api/queryKeys';
import { supabase } from '@/supabase';
import type { Group } from '@/types';
import { useQuery } from '@tanstack/react-query';

// ---------- API (server-facing) ----------
export type CreateGroupPayload = {
  name: string;
  description?: string | null;
  created_by: string;
  // other DB columns...
};

// Server function: only sends DB columns
export async function createGroupServer(payload: CreateGroupPayload): Promise<Group> {
  const { data, error } = await supabase.from('groups').insert(payload).select('*').single();

  if (error) throw error;
  return data;
}

// ---------- Hooks / helpers ----------
export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchGroup(groupId: string): Promise<Group> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
  if (error) throw error;
  return data;
}

// groups list
export function useGroups() {
  return useQuery<Group[], Error>({
    queryKey: QUERY_KEYS.groups.list,
    queryFn: fetchGroups,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (was gcTime)
    refetchOnWindowFocus: false,
  });
}

// single group
export function useGroup(groupId: string) {
  return useQuery<Group, Error>({
    queryKey: QUERY_KEYS.groups.details(groupId),
    queryFn: () => fetchGroup(groupId),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    enabled: !!groupId, // prevents running when groupId is falsy
  });
}

/**
 * Client-facing payload (includes client temp id)
 */
export type CreateGroupClientPayload = CreateGroupPayload & {
  __clientTempId?: string; // client-only marker (never sent to DB)
};

export function useCreateGroup() {
  return useOptimisticMutation<Group, CreateGroupClientPayload, { previousMap?: Map<string, any> }>(
    {
      // mutationFn strips __clientTempId and sends only server fields
      mutationFn: async (vars) => {
        const { __clientTempId, ...serverPayload } = vars as CreateGroupClientPayload;
        // call server insert (returns the created row)
        const created = await createGroupServer(serverPayload as CreateGroupPayload);
        return created;
      },

      targetQueryKey: QUERY_KEYS.groups.list,

      optimisticUpdate: ({ previous, variables }) => {
        const tmpId = variables.__clientTempId ?? `tmp-${Date.now()}`;
        const optimisticGroup: Group & { __clientTempId?: string } = {
          id: tmpId, // this is client-side id for optimistic item
          name: variables.name,
          description: variables.description ?? null,
          createdBy: variables.created_by,
          createdAt: new Date().toISOString(),
          // any other Group fields — set sensible defaults
          __clientTempId: tmpId,
        } as Group & { __clientTempId?: string };

        if (!previous) return [optimisticGroup];
        return [optimisticGroup, ...previous];
      },

      // Replace the exact optimistic item with server returned item using __clientTempId
      replaceOnSuccess: ({ data, variables, qc }) => {
        const key = QUERY_KEYS.groups.list;
        const clientTempId = variables.__clientTempId;
        qc.setQueryData(key, (prev: (Group & { __clientTempId?: string })[] = []) => {
          // if no prev items, just prepend server data
          if (!prev || prev.length === 0) return [data];

          // find exact optimistic entry by __clientTempId
          const idx = prev.findIndex(
            (g) => (g as any).__clientTempId && (g as any).__clientTempId === clientTempId
          );

          // If found, replace preserving position
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data;
            return copy;
          }

          // if not found, prepend server object (no duplicates expected)
          // also dedupe by server id if already present
          if (prev.find((g) => g.id === data.id)) return prev;
          return [data, ...prev];
        });

        // write detail cache for convenience
        qc.setQueryData(QUERY_KEYS.groups.details(data.id), data);
      },

      // no invalidation: we've replaced in-place
      invalidateQueryKeys: [],
    }
  );
}
