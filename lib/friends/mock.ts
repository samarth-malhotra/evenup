export const mockFriends = [
  {
    id: 'f1',
    name: 'Rohit',
    relation: 'owed',
    total: 1200,
    groups: [
      { name: 'Goa Trip', amount: 700, relation: 'owed' },
      { name: 'Office Lunch', amount: 500, relation: 'owed' },
    ],
  },
  {
    id: 'f2',
    name: 'Anita',
    relation: 'owe',
    total: 800,
    groups: [
      { name: 'Birthday Party', amount: 300, relation: 'owe' },
      { name: 'Flat Rent', amount: 500, relation: 'owe' },
    ],
  },
  { id: 'f3', name: 'Karan', relation: 'settled', total: 0, groups: [] },
];

export const mockFriendTransactions: Record<string, any> = {
  f1: {
    id: 'f1',
    name: 'Rohit',
    relation: 'owed',
    total: 1200,
    transactions: [
      {
        id: 't1',
        group: 'Goa Trip',
        title: 'Dinner at beach shack',
        amount: 700,
        relation: 'owed',
      },
      { id: 't2', group: 'Office Lunch', title: 'Pizza party', amount: 500, relation: 'owed' },
    ],
  },
  f2: {
    id: 'f2',
    name: 'Anita',
    relation: 'owe',
    total: 800,
    transactions: [
      { id: 't3', group: 'Birthday Party', title: 'Cake & Snacks', amount: 300, relation: 'owe' },
      { id: 't4', group: 'Flat Rent', title: 'Monthly rent', amount: 500, relation: 'owe' },
    ],
  },
  f3: {
    id: 'f3',
    name: 'Karan',
    relation: 'settled',
    total: 0,
    transactions: [],
  },
};
