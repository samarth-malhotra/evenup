// app/friends/[id].tsx
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';
// import SettleSheet from '@/lib/shared/components/SettleSheet';

import { mockFriendTransactions } from '../mock';
import { amountColor, relationLabel } from '../utils';
import FriendSettleUpSheet from './FriendSettleUpSheet';

export default function FriendTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const friend = mockFriendTransactions[id ?? ''] ?? null;

  // Modal state
  const [showSettle, setShowSettle] = useState(false);
  const [editAmount, setEditAmount] = useState<string>('');

  const numericAmount = useMemo(() => {
    const n = parseFloat(editAmount.replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  }, [editAmount]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title={friend?.name ?? 'Friend'} showBackButton />,
    });
  }, [navigation, friend?.name]);

  if (!friend) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Friend not found</Text>
      </View>
    );
  }

  const openSettle = () => {
    setEditAmount(String(friend.total || 0));
    setShowSettle(true);
  };

  const closeSettle = () => setShowSettle(false);

  const confirmSettle = () => {
    // TODO: call store/action to mark all transactions with this friend as settled (amount = numericAmount)
    console.log('Settled with', friend.name, 'amount:', numericAmount);
    setShowSettle(false);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Centered, larger header card */}
      <View className="m-4 rounded-3xl bg-white p-6 shadow-sm">
        <View className="items-center">
          <Text className="text-xs uppercase tracking-wide text-gray-500">Total Balance</Text>
          <Text className={`mt-2 text-4xl font-extrabold ${amountColor(friend.relation)}`}>
            {friend.total > 0 ? `₹${friend.total}` : '₹0'}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">{relationLabel(friend.relation)}</Text>
        </View>
      </View>

      {/* Transactions */}
      <FlatList
        data={friend.transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <View className="rounded-2xl bg-white p-4 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-sm text-gray-500">{item.group}</Text>
              </View>
              <Text className={`text-base font-semibold ${amountColor(item.relation)}`}>
                ₹{item.amount}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text className="mt-8 text-center text-gray-500">
            No transactions with this friend 🎉
          </Text>
        )}
      />

      {/* Settle All CTA */}
      {friend.total > 0 && (
        <View className="absolute bottom-4 left-4 right-4">
          <TouchableOpacity
            onPress={openSettle}
            className="rounded-full bg-indigo-600 py-4 shadow-lg active:bg-indigo-700">
            <Text className="text-center text-lg font-semibold text-white">Settle All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 👇 Reusable Gorhom sheet */}
      <FriendSettleUpSheet
        open={showSettle}
        onClose={closeSettle}
        friendName={friend.name}
        relation={friend.relation}
        amountStr={editAmount}
        onChangeAmount={setEditAmount}
        onConfirm={confirmSettle}
      />
    </View>
  );
}
