// app/friends/[id].tsx
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';
import SettleUpSheet from '@/lib/shared/components/SettleUpSheet';
import SummaryCard from '@/lib/shared/components/SummaryCard';
import TransactionCard from '@/lib/shared/components/TransactionCard';
import { formatRs } from '@/lib/shared/utils/utils';

import { mockFriendTransactions } from '../mock';
type TransactionItem = {
  id: string;
  group: string;
  title: string;
  amount: number;
  status: string;
};
export type TxItem = {
  id: string;
  name: string;
  total: number;
  youOwe: number;
  friendOwe: number;
  transactions: TransactionItem[];
};

export default function FriendTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amountStr, setAmountStr] = useState<string>('0');
  const [activeItem, setActiveItem] = useState<TxItem | null>(null);

  const item: TxItem | null = mockFriendTransactions[id] ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title={`${item?.name}`} showBackButton />,
    });
  }, [navigation]);

  const openSettleForTx = (tx: TransactionItem) => {
    // clear friend-level active item (or you can set a different state for activeTx)
    setActiveItem(null);
    setAmountStr(String(tx.amount ?? 0));
    setSheetOpen(true);
  };

  const numericAmount = useMemo(() => {
    const n = parseFloat(amountStr.replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  }, [amountStr]);

  const confirmSettle = () => {
    const amt = numericAmount;
    // if you are settling a transaction you might want to pass tx id,
    // currently we do a generic handler - adapt as needed:
    handleSettle({ id: activeItem?.id, amount: amt });
    setSheetOpen(false);
  };

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Friend not found</Text>
      </View>
    );
  }

  const handleSettle = ({ id: txId, amount }: { id?: string; amount: number }) => {
    console.log('Settle friend', item.name, txId, amount);
    // persist or update mock state here
  };

  return (
    <>
      <View className="mb-4 flex-row gap-2 space-x-3 px-4">
        <SummaryCard title="Total" value={formatRs(2000)} type="total" />
        <SummaryCard title="You Owe" value={formatRs(0)} type="you" />
        <SummaryCard title="Friends Owe" value={formatRs(2000)} type="friend" />
      </View>

      <FlatList<TransactionItem>
        data={item.transactions}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }: { item: TransactionItem }) => (
          <TransactionCard
            title={item.title}
            subtitle={item.group}
            avatarInitials={item.title?.[0] ?? 'U'}
            amount={item.amount}
            status={'settle'}
            onSettle={() => openSettleForTx(item)}
          />
        )}
      />
      <SettleUpSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        // payerLabel={activeItem?.relation === 'owe' ? 'You' : (activeItem?.name ?? 'You')}
        // payeeLabel={activeItem?.relation === 'owe' ? (activeItem?.name ?? 'Friend') : 'You'}
        // contextLabel={mode === 'group' ? `Group: ${title}` : undefined}
        amountStr={'2000'}
        onChangeAmount={setAmountStr}
        onConfirm={confirmSettle}
      />
    </>
  );
}
