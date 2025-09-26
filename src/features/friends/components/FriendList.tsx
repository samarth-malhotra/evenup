// app/friends/index.tsx
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import TransactionCard from '@/components/TransactionCard';
import type { TransactionStatus } from '@/components/TransactionCard';
import { mockFriends } from '@/features/friends/mock';

export default function FriendList() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Friends" showBackButton={false} />,
    });
  }, [navigation]);

  return (
    <View className="flex-1 px-4">
      {mockFriends.length ? (
        mockFriends.map((item) => (
          <TransactionCard
            key={item.id}
            title={item.title}
            avatarInitials="R"
            badges={item.groups}
            amount={item.amount}
            status={item.status as TransactionStatus}
            // onPress={() => console.log('open person')}
            onPress={() => router.push(`/friends/${item.id}`)}
          />
        ))
      ) : (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-lg font-medium text-gray-600">
            🎉 No pending balances with friends
          </Text>
        </View>
      )}
    </View>
  );
}
