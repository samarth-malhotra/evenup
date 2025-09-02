import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

import { groups } from '../mocks/groupList';

export default function GroupList() {
  const navigation = useNavigation();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(t));
  }, [q]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title="Groups"
          showBackButton={false}
          rightActions={
            <Pressable
              onPress={() => router.push(`/(tabs)/groups/[id]/new-member`)}
              accessibilityLabel="New Group">
              <MaterialCommunityIcons name="account-multiple-plus" size={28} color="#fff" />
            </Pressable>
          }
        />
      ),
    });
  }, [navigation]);

  return (
    <View className="flex-1 px-4 pt-2">
      {/* Search */}
      <View className="mb-4 h-11 flex-row items-center rounded-full border border-gray-200 bg-white px-3">
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Search groups"
          placeholderTextColor="#9CA3AF"
          value={q}
          onChangeText={setQ}
          className="ml-2 flex-1 text-[15px] text-gray-900"
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-3.5" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-row items-center rounded-2xl bg-white px-3.5 py-3 shadow-sm"
            onPress={() => router.push(`/(tabs)/groups/${item.id}`)}>
            <Image source={{ uri: item.img }} className="mr-3 h-11 w-11 rounded-full" />
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-gray-900" numberOfLines={1}>
                {item.name}
              </Text>
              {item.subtitle ? (
                <Text className="mt-0.5 text-[13px] text-gray-500" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
            {/* Badge */}
            <View
              className={`ml-2 self-center rounded-full px-2.5 py-1 ${
                item.type === 'owe'
                  ? 'bg-amber-100'
                  : item.type === 'owed'
                    ? 'bg-green-100'
                    : 'bg-gray-100'
              }`}>
              <Text
                className={`text-[12px] font-medium ${
                  item.type === 'owe'
                    ? 'text-amber-700'
                    : item.type === 'owed'
                      ? 'text-green-700'
                      : 'text-gray-500'
                }`}
                numberOfLines={1}>
                {item.badge}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
