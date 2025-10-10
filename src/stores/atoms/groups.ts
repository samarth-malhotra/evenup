// just a sample can be removed and replaced
import { atom } from 'jotai';

import type { Group, GroupMember } from '@/features/groups/components/GroupList';
import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';

// base atom: groups list (kept in memory; persist if you want)
export const groupsAtom = persistedAtom<Group[] | []>(STORAGE_KEYS.GROUPLIST, []);

export const selectedGroupIdAtom = atom<string | null>(null);

// derived: select a group by id
export const selectedGroupAtom = atom((get) => {
  const groups = get(groupsAtom);
  const id = get(selectedGroupIdAtom);
  return groups.find((g) => g.id === id) ?? null;
});

// derived: members of selected group
export const selectedGroupMembersAtom = atom((get) => {
  const group = get(selectedGroupAtom);
  return group?.members ?? ([] as GroupMember[]);
});

// Writable atom — add a new member of any group
export const addGroupMemberAtom = atom(
  null,
  (
    get,
    set,
    {
      groupId,
      memberId,
      role = 'member',
      payload,
    }: {
      groupId: string;
      memberId: string;
      role?: 'owner' | 'member';
      payload: GroupMember;
    }
  ) => {
    set(groupsAtom, (prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          ...(role === 'owner'
            ? { owner: payload }
            : {
                members: [...g.members, payload],
              }),
        };
      })
    );
  }
);
