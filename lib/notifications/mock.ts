import type { Activity } from './types';

// ---------- Mock seed (replace with API) ----------
export const seed: Activity[] = [
  {
    id: 'a1',
    title: 'You paid for Dinner at Barbeque Nation',
    subtitle: 'Office Friends',
    amountText: '₹ 850',
    createdAt: Date.now() - 1000 * 60 * 10, // 10m ago
    read: false,
    category: 'expense',
  },
  {
    id: 'a2',
    title: 'Juhi settled up with you',
    subtitle: 'UPI • ****2183',
    amountText: '₹ 300',
    createdAt: Date.now() - 1000 * 60 * 60 * 3, // 3h ago
    read: false,
    category: 'settlement',
  },
  {
    id: 'a3',
    title: 'New group created: Family Trip',
    createdAt: Date.now() - 1000 * 60 * 60 * 26, // yesterday
    read: true,
    category: 'group',
  },
  {
    id: 'a4',
    title: 'Report is ready to view',
    subtitle: 'July summary',
    createdAt: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    read: true,
    category: 'system',
  },
];
