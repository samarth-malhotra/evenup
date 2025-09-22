// data/groups.ts
export type Member = { id: string; name: string; avatar?: string };
export type Expense = {
  splits: any;
  paidBy: string;
  id: string;
  title: string;
  by: string; // memberId
  amount: number; // in INR
  createdAt: number;
  groupId?: string;
  date?: string;
  category?: string;
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
      {
        id: 'e1',
        title: 'Dinner at BBQ',
        by: 'u1',
        amount: 850,
        createdAt: now - 10 * 60 * 1000,
        splits: undefined,
        paidBy: '',
      },
      {
        id: 'e2',
        title: 'Cab',
        by: 'u2',
        amount: 260,
        createdAt: now - 26 * 60 * 60 * 1000,
        splits: undefined,
        paidBy: '',
      },
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
        splits: undefined,
        paidBy: '',
      },
    ],
  },
};

// export function selectGroup(id?: string) {
//   if (!id) return undefined;
//   return GROUPS[id];
// }

// export function selectExpenses(id?: string) {
//   const g = selectGroup(id);
//   return g ? [...g.expenses].sort((a, b) => b.createdAt - a.createdAt) : [];
// }

// export function memberName(group: Group, memberId: string) {
//   return group.members.find((m) => m.id === memberId)?.name ?? 'Someone';
// }

// // super-simple split: equal shares across members
// export function computeBalances(group: Group, youId = 'u1') {
//   const n = group.members.length || 1;
//   let youOwe = 0;
//   let friendsOwe = 0;

//   for (const exp of group.expenses) {
//     const share = exp.amount / n;
//     if (exp.by === youId) {
//       // you paid for others' shares
//       friendsOwe += share * (n - 1);
//     } else {
//       // someone else paid your share
//       youOwe += share;
//     }
//   }
//   const net = Math.round(friendsOwe - youOwe);
//   return { youOwe: Math.max(0, -net), friendsOwe: Math.max(0, net), net };
// }

// Remove these and use your real implementations
export const selectGroup = (id?: string) =>
  id ? { id, name: 'Goa Trip', currency: 'INR' } : undefined;
export const selectExpenses = (groupId?: string): Expense[] =>
  !groupId
    ? []
    : [
        {
          id: 'e1',
          groupId,
          title: 'Taxi from airport',
          amount: 1200,
          paidBy: 'u2',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          category: 'travel',
          splits: { me: 400, u2: 400, u3: 400 },
          by: '',
          createdAt: 0,
        },
        {
          id: 'e2',
          groupId,
          title: 'Lunch Day 1',
          amount: 1800,
          paidBy: 'me',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
          category: 'food',
          splits: { me: 600, u2: 600, u3: 600 },
          by: '',
          createdAt: 0,
        },
        {
          id: 'e3',
          groupId,
          title: 'Beach shack snacks',
          amount: 900,
          paidBy: 'u3',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
          category: 'food',
          splits: { me: 300, u2: 300, u3: 300 },
          by: '',
          createdAt: 0,
        },
      ];

export const selectMemberById = (memberId: string): Member | undefined => {
  const book: Record<string, Member> = {
    me: { id: 'me', name: 'You' },
    u2: { id: 'u2', name: 'Anita' },
    u3: { id: 'u3', name: 'Rohit' },
  };
  return book[memberId];
};

export const computeBalances = (groupId: string, currentUserId: string) => {
  const list = selectExpenses(groupId);
  const total = list.reduce((s, e) => s + e.amount, 0);
  let youOwe = 0;
  let friendsOweYou = 0;
  for (const e of list) {
    const myShare = e.splits[currentUserId] ?? 0;
    if (e.paidBy === currentUserId) {
      friendsOweYou += e.amount - myShare;
    } else {
      youOwe += myShare;
    }
  }
  return { total, youOwe, friendsOweYou };
};

export const currency = (code?: string) => {
  switch (code) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    default:
      return '₹';
  }
};
