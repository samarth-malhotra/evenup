// app/friends/[id].tsx
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

import SettlementScreen from '../../shared/components/SettlementScreen';
import { mockFriendTransactions } from '../mock';

export default function FriendTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const friend = mockFriendTransactions[id ?? ''] ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title={`${friend.name}`} showBackButton />,
    });
  }, [navigation]);

  if (!friend) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Friend not found</Text>
      </View>
    );
  }

  const items = (friend.transactions || []).map((t) => ({
    id: t.id,
    name: t.title,
    amount: t.amount,
    relation: t.relation,
    meta: t.group,
  }));

  const handleSettle = ({ id: txId, amount }: { id?: string; amount: number }) => {
    console.log('Settle friend', friend.name, txId, amount);
    // persist or update mock state here
  };

  return (
    <SettlementScreen
      mode="friend"
      title={friend.name}
      total={friend.total}
      relation={friend.relation}
      items={items}
      onSettleAction={handleSettle}
      showSettleAll
    />
  );
}
