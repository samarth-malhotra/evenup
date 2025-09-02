// data/groups.ts
export type Member = { id: string; name: string; avatar?: string };
export type Expense = {
  id: string;
  title: string;
  by: string; // memberId
  amount: number; // in INR
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  members: Member[];
  avatar?: string;
  expenses: Expense[];
};

// --- demo data (replace with API) ---
const now = Date.now();

export const GROUPS: Record<string, Group> = {
  '1': {
    id: '1',
    name: 'Office Friends',
    avatar: 'https://i.pravatar.cc/96?img=5',
    members: [
      { id: 'u1', name: 'Rohan' },
      { id: 'u2', name: 'Juhi' },
      { id: 'u3', name: 'Aadi' },
    ],
    expenses: [
      { id: 'e1', title: 'Dinner at BBQ', by: 'u1', amount: 850, createdAt: now - 10 * 60 * 1000 },
      { id: 'e2', title: 'Cab', by: 'u2', amount: 260, createdAt: now - 26 * 60 * 60 * 1000 },
    ],
  },
  '2': {
    id: '2',
    name: 'College Buddies',
    avatar: 'https://i.pravatar.cc/96?img=14',
    members: [
      { id: 'u4', name: 'Riya' },
      { id: 'u5', name: 'Sam' },
      { id: 'u6', name: 'Kavya' },
    ],
    expenses: [
      {
        id: 'e3',
        title: 'Movie tickets',
        by: 'u5',
        amount: 600,
        createdAt: now - 2 * 24 * 60 * 60 * 1000,
      },
    ],
  },
};

export function selectGroup(id?: string) {
  if (!id) return undefined;
  return GROUPS[id];
}

export function selectExpenses(id?: string) {
  const g = selectGroup(id);
  return g ? [...g.expenses].sort((a, b) => b.createdAt - a.createdAt) : [];
}

export function memberName(group: Group, memberId: string) {
  return group.members.find((m) => m.id === memberId)?.name ?? 'Someone';
}

// super-simple split: equal shares across members
export function computeBalances(group: Group, youId = 'u1') {
  const n = group.members.length || 1;
  let youOwe = 0;
  let friendsOwe = 0;

  for (const exp of group.expenses) {
    const share = exp.amount / n;
    if (exp.by === youId) {
      // you paid for others' shares
      friendsOwe += share * (n - 1);
    } else {
      // someone else paid your share
      youOwe += share;
    }
  }
  const net = Math.round(friendsOwe - youOwe);
  return { youOwe: Math.max(0, -net), friendsOwe: Math.max(0, net), net };
}
