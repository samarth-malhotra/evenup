export const pendingSettlements = {
  g1: {
    id: 'g1',
    name: 'Goa trip',
    total: 2000,
    youOwe: 0,
    friendOwe: 2000,
    participants: [
      {
        id: 't1',
        paidBy: 'You',
        name: 'Rohit',
        amount: 700,
        status: 'you-owe',
      },
      {
        id: 't2',
        paidBy: 'Rohit',
        name: 'Anita',
        amount: 600,
        status: 'friend-owe',
      },
      {
        id: 't3',
        paidBy: 'You',
        name: 'Karan',
        amount: 700,
        status: 'you-owe',
      },
    ],
  },

  g2: {
    id: 'g2',
    name: 'Flat Rent',
    total: 12000,
    youOwe: 4000,
    friendOwe: 8000,
    participants: [
      {
        id: 't4',
        paidBy: 'You',
        name: 'Rohit',
        amount: 4000,
        status: 'you-owe',
      },
      {
        id: 't5',
        paidBy: 'Rohit',
        name: 'You',
        amount: 8000,
        status: 'friend-owe',
      },
    ],
  },

  g3: {
    id: 'g3',
    name: 'Birthday Party',
    total: 3500,
    youOwe: 1500,
    friendOwe: 2000,
    participants: [
      {
        id: 't6',
        paidBy: 'You',
        name: 'Sneha',
        amount: 1500,
        status: 'you-owe',
      },
      {
        id: 't7',
        paidBy: 'Sneha',
        name: 'You',
        amount: 2000,
        status: 'friend-owe',
      },
    ],
  },
};
