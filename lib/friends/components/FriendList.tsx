// app/friends/index.tsx
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useLayoutEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

import { mockFriends } from '../mock';
import { amountColor, chipClasses, relationLabel } from '../utils';

export default function FriendList() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Friends" showBackButton />,
    });
  }, [navigation]);

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={mockFriends}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/friends/${item.id}`)}
            className="rounded-2xl bg-white p-3.5 shadow-sm">
            <View className="flex-row items-start">
              {/* Avatar */}
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                <Text className="text-sm font-semibold text-gray-600">{item.name.charAt(0)}</Text>
              </View>

              {/* Name + chips (compact) */}
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
                  {item.name}
                </Text>

                {item.groups.length > 0 ? (
                  <View className="-mb-0.5 mt-1 flex-row flex-wrap gap-x-1.5 gap-y-1">
                    {item.groups.map((g) => (
                      <View
                        key={`${item.id}-${g.name}`}
                        className={`rounded-full px-2.5 py-0.5 ${chipClasses(g.relation)}`}>
                        <Text className="text-[11px] font-medium">
                          {g.name} · ₹{g.amount}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-1 text-[12px] text-gray-400">No groups</Text>
                )}
              </View>

              {/* Amount + relation (top-aligned, tight) */}
              <View className="ml-2 items-end">
                <Text className={`-mt-0.5 text-base font-semibold ${amountColor(item.relation)}`}>
                  {item.total > 0 ? `₹${item.total}` : '—'}
                </Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">
                  {relationLabel(item.relation)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-lg font-medium text-gray-600">
              🎉 No pending balances with friends
            </Text>
          </View>
        )}
      />
    </View>
  );
}
