// app/screens/TransactionsDemo.tsx

import { ScrollView, Text, View } from 'react-native';

import TransactionCard from '@/components/TransactionCard';
import { CONFIG } from '@/config';
import { userAtom } from '@/stores/atoms/user';
import { STORAGE_KEYS } from '@/stores/storageKeys';
import { useAtomValue } from 'jotai';

/* --------------------------- TransactionsDemoScreen --------------------------- */

export default function TransactionsDemoScreen() {
  const user = useAtomValue(userAtom);
  console.log('user:', user);

  console.log('Base API:', CONFIG.API_URL);
  console.log('STORAGE_KEYS:', STORAGE_KEYS.USER);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#0F172A' }}>
        Transactions — Variations
      </Text>

      {/* 1. Rollup: Person owes across multiple groups */}
      <TransactionCard
        title="Rohit"
        avatarInitials="R"
        badges={[
          { title: 'Goa Trip', amount: 700, status: 'friend-owe' },
          { title: 'Office Lunch', amount: 500, status: 'you-owe' },
        ]}
        amount={1200}
        status="friend-owe"
        onPress={() => console.log('open person')}
      />

      {/* 2. Expense detail */}
      <TransactionCard
        title="Kunal Shah"
        subtitle="📁 Goa Trip · 28 Jun · 21:50"
        avatarInitials="KS"
        amount={2750}
        status="you-owe"
        onPress={() => console.log('open expense')}
      />

      {/* 3. Group summary */}
      <TransactionCard
        title="Goa Trip"
        subtitle="4 members · Last activity 2d ago"
        avatarInitials="GT"
        amount={500}
        status="you-owe"
      />

      {/* 4. Expense with paid-by */}
      <TransactionCard
        title="Beach shack snacks"
        subtitle="Paid by Rohit · 29 Aug 2025"
        avatarInitials="B"
        amount={900}
        status="you-owe"
        hasAttachment
      />

      {/* 5. Prominent Settle CTA */}
      <TransactionCard
        title="You → Rohit"
        subtitle="Split equally"
        avatarInitials="Y"
        amount={500}
        status="settle"
        onSettle={() => console.log('settle pressed')}
      />

      <TransactionCard
        title="You → Rohit"
        subtitle="Split equally"
        avatarInitials="Y"
        amount={500}
        status="settled"
        onSettle={() => console.log('settle pressed')}
      />

      {/* 6. Compact variant */}
      <TransactionCard title="You" avatarInitials="Y" amount={400} status="you-owe" compact />

      {/* 7. Settled / history item (disabled) */}
      <TransactionCard
        title="Paid to Rohit"
        subtitle="Settled · 1 Sep"
        avatarInitials="P"
        amount={500}
        disabled
      />

      {/* 8. Pending / reminder */}
      <TransactionCard
        title="Request from Kunal"
        subtitle="You asked on 2 Sep"
        avatarInitials="K"
        amount={350}
        status="pending"
        onPress={() => console.log('open request')}
      />

      {/* 9. Split among many (compact avatars idea) */}
      <TransactionCard
        title="Dinner (split)"
        subtitle="You + 3 others"
        avatarInitials="D"
        amount={1600}
        status="you-owe"
      />

      {/* 10. New/unread */}
      <TransactionCard
        title="New expense from Priya"
        subtitle="Team dinner · 3 Sep"
        avatarInitials="P"
        amount={1200}
        status="you-owe"
        isNew
      />

      {/* 11. Error / retry */}
      <TransactionCard
        title="Failed settle"
        subtitle="Attempted 3m ago"
        avatarInitials="F"
        amount={500}
        status="error"
        errorMessage="Network error"
        onRetry={() => console.log('retry')}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
