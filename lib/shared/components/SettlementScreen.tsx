// lib/shared/screens/CommonTransactionsScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

import SettleUpSheet from './SettleUpSheet';
// import SettleUpSheet from '@/lib/shared/components/SettleSheet';

// Minimal shape used by the shared screen
export type TxItem = {
  id: string;
  name: string; // display name (friend or member)
  amount: number;
  relation?: 'owe' | 'owed' | string; // drives color
  meta?: string; // optional subtitle (group or note)
};

type Props = {
  mode: 'friend' | 'group';
  title: string; // friend name or group name
  total?: number; // used for friend header
  relation?: 'owe' | 'owed' | string;
  items: TxItem[];
  onSettleAction?: (payload: { id?: string; amount: number; item?: TxItem }) => void;
  showSettleAll?: boolean;
};

export default function CommonTransactionsScreen({
  mode,
  title,
  total = 0,
  relation = 'owed',
  items,
  onSettleAction,
  showSettleAll = false,
}: Props) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title={title ?? 'Transactions'} showBackButton />,
    });
  }, [navigation, title]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [amountStr, setAmountStr] = useState<string>('0');
  const [activeItem, setActiveItem] = useState<TxItem | null>(null);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amountStr.replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  }, [amountStr]);

  const openSettleFor = (item: TxItem) => {
    setActiveItem(item);
    setAmountStr(String(item.amount ?? 0));
    setSheetOpen(true);
  };

  const confirmSettle = () => {
    const amt = numericAmount;
    if (onSettleAction)
      onSettleAction({ id: activeItem?.id, amount: amt, item: activeItem ?? undefined });
    setSheetOpen(false);
  };

  const amountColor = (rel?: string) => (rel === 'owe' ? 'text-red-600' : 'text-green-600');

  return (
    <View className="flex-1 bg-gray-50">
      {/* Friend header card only for friend mode */}
      {mode === 'friend' && (
        <View className="m-4 rounded-3xl bg-white p-6 shadow-sm">
          <View className="items-center">
            <Text className="text-xs uppercase tracking-wide text-gray-500">Total Balance</Text>
            <Text className={`mt-2 text-4xl font-extrabold ${amountColor(relation)}`}>
              {total > 0 ? `₹${total}` : '₹0'}
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              {relation === 'owe' ? 'You owe' : 'You are owed'}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <View className="rounded-2xl bg-white p-3 shadow-sm">
            <View className="flex-row items-center justify-between">
              {/* Left: avatar + name */}
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                  <Text className="text-sm font-semibold text-gray-600">
                    {item.name?.charAt(0)}
                  </Text>
                </View>
                <View style={{ maxWidth: 180 }}>
                  <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.meta && <Text className="text-xs text-gray-500">{item.meta}</Text>}
                </View>
              </View>

              {/* Right: amount + Settle button side-by-side */}
              <View className="flex-row items-center gap-3">
                <Text className={`text-base font-semibold ${amountColor(item.relation)}`}>
                  ₹{item.amount}
                </Text>

                <Pressable
                  onPress={() => openSettleFor(item)}
                  className="rounded-full bg-green-600 px-3 py-2">
                  <Text className="text-sm font-medium text-white">Settle</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text className="mt-8 text-center text-gray-500">
            {mode === 'friend'
              ? 'No transactions with this friend 🎉'
              : 'No pending settlements 🎉'}
          </Text>
        )}
      />

      {/* Settle All for friend */}
      {mode === 'friend' && showSettleAll && total > 0 && (
        <View className="absolute bottom-4 left-4 right-4">
          <TouchableOpacity
            onPress={() => {
              // create a pseudo item for settle-all flow (no id)
              setActiveItem(null);
              setAmountStr(String(total));
              setSheetOpen(true);
            }}
            className="rounded-full bg-indigo-600 py-4 shadow-lg active:bg-indigo-700">
            <Text className="text-center text-lg font-semibold text-white">Settle All</Text>
          </TouchableOpacity>
        </View>
      )}

      <SettleUpSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        payerLabel={activeItem?.relation === 'owe' ? 'You' : (activeItem?.name ?? 'You')}
        payeeLabel={activeItem?.relation === 'owe' ? (activeItem?.name ?? 'Friend') : 'You'}
        contextLabel={mode === 'group' ? `Group: ${title}` : undefined}
        amountStr={amountStr}
        onChangeAmount={setAmountStr}
        onConfirm={confirmSettle}
      />
    </View>
  );
}
