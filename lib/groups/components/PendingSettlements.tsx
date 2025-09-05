// app/groups/[id]/pending-settlements.tsx
import { useLocalSearchParams } from 'expo-router';

import SettlementScreen from '@/lib/shared/components/SettlementScreen';

// use your real selector/selectGroup to get group name/ pending list
const mockPending = [
  { id: 'u1', name: 'You → Rohit', amount: 500, relation: 'owe' },
  { id: 'u2', name: 'Rohit → You', amount: 1200, relation: 'owed' },
  { id: 'u3', name: 'Rohit → Anita', amount: 800, relation: 'friend-owes' },
];

export default function PendingSettlements() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Replace with selectGroup(id) in real code:
  const groupName = `Mock Group ${id ?? ''}`;

  const handleSettle = ({ id: txId, amount }: { id?: string; amount: number }) => {
    console.log('Settle group item', txId, amount);
    // implement settlement flow: mark transaction(s) settled
  };

  return (
    <SettlementScreen
      mode="group"
      title={groupName}
      total={0}
      relation="owe"
      items={mockPending}
      onSettleAction={handleSettle}
    />
  );
}
