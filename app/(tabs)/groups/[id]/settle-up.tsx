// app/groups/[id]/pending-settlements.tsx
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

// ---------------- Mock Data (replace with real selector) ----------------
const mockPending = [
  { id: 'u1', name: 'You', relation: 'owe', amount: 500, other: 'Rohit' },
  { id: 'u2', name: 'Rohit', relation: 'owed', amount: 1200, other: 'You' },
  {
    id: 'u3',
    name: 'Anita',
    relation: 'friend-owes',
    amount: 800,
    friend: 'Rohit',
    other: 'Anita',
  },
];

// ---------------- Screen ----------------
export default function PendingSettlementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Pending Settlements" showBackButton />,
    });
  }, [navigation]);

  const renderRelation = (item: any) => {
    if (item.relation === 'owe') return 'You owe';
    if (item.relation === 'owed') return 'You are owed';
    if (item.relation === 'friend-owes') return `${item.friend} owes`;
    return '';
  };

  const renderAmountColor = (relation: string) => {
    if (relation === 'owe') return 'text-red-600';
    if (relation === 'owed') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <View className="flex-1">
      {mockPending.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-medium text-gray-600">
            🎉 All clear! No pending settlements
          </Text>
        </View>
      ) : (
        <FlatList
          data={mockPending}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;

            return (
              <View className="rounded-2xl bg-white shadow-sm">
                {/* Row */}
                <Pressable
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex-row items-center gap-3 p-4">
                  {/* Avatar placeholder */}
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                    <Text className="text-sm font-semibold text-gray-600">
                      {item.name.charAt(0)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
                    <Text className="text-sm text-gray-500">{renderRelation(item)}</Text>
                  </View>

                  {/* Amount */}
                  <Text className={`text-lg font-semibold ${renderAmountColor(item.relation)}`}>
                    ₹{item.amount}
                  </Text>
                </Pressable>

                {/* Expanded Section */}
                {isExpanded && (
                  <View className="border-t border-gray-100 px-4 pb-4">
                    <Text className="mt-3 text-sm text-gray-700">
                      {item.relation === 'owe' && `You → ${item.other}`}
                      {item.relation === 'owed' && `${item.other} → You`}
                      {item.relation === 'friend-owes' && `${item.friend} → ${item.other}`}
                    </Text>
                    <Text className="mt-1 text-lg font-semibold text-gray-900">₹{item.amount}</Text>

                    <View className="mt-3 flex-row gap-3">
                      <Pressable className="flex-1 rounded-full bg-green-600 py-2">
                        <Text className="text-center font-medium text-white">Settle</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setExpandedId(null)}
                        className="flex-1 rounded-full bg-gray-200 py-2">
                        <Text className="text-center font-medium text-gray-700">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
