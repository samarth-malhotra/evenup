// just a sample can be removed and replaced
import type { Group, GroupMember } from '@/types';
import { atom } from 'jotai';

// base atom: groups list (kept in memory; persist if you want)
export const groupsAtom = atom<Group[]>([]);

// derived: select a group by id
export const selectedGroupIdAtom = atom<string | null>(null);

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
