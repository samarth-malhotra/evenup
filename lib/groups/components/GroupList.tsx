import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';
import type { TransactionStatus } from '@/lib/shared/components/TransactionCard';
import TransactionCard from '@/lib/shared/components/TransactionCard';

import { groups } from '../mocks/groupList';
import NewGroupSheet from './BottomSheet/CreateGroupSheet';

export default function GroupList() {
  const navigation = useNavigation();
  const [q, setQ] = useState('');
  const [openNewGroupSheet, setOpenNewGroupSheet] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.title.toLowerCase().includes(t));
  }, [q]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title="Groups"
          showBackButton={false}
          rightActions={
            <Pressable onPress={() => setOpenNewGroupSheet(true)} accessibilityLabel="New Group">
              <MaterialCommunityIcons name="account-multiple-plus" size={28} color="#fff" />
            </Pressable>
          }
        />
      ),
    });
  }, [navigation]);

  return (
    <View className="flex-1 px-4">
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
        renderItem={({ item }) => (
          <TransactionCard
            className="mx-2 mb-2"
            onPress={() => router.push(`/(tabs)/groups/${item.id}`)}
            title={item.title}
            subtitle={item.subtitle}
            avatarInitials={item.avatarInitials}
            img={item.img}
            amount={item.amount}
            status={item.status as TransactionStatus}
          />
        )}
      />
      {/* Create New Group Bottom Sheet */}
      <NewGroupSheet
        open={openNewGroupSheet}
        onClose={() => setOpenNewGroupSheet(false)}
        onCreate={(payload) => {
          // handle create here
          console.log('create group', payload);
        }}
      />
    </View>
  );
}
