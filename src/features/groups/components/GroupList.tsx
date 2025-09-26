// import groups from '@/app/(tabs)/groups';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import type { TransactionStatus } from '@/components/TransactionCard';
import TransactionCard from '@/components/TransactionCard';
import NewGroupSheet from '@/features/groups/components/BottomSheet/CreateGroupSheet';
import { groups } from '@/features/groups/mocks/groupList';
import { useColor } from '@/hooks/useColor';
import { useTheme } from '@/hooks/useTheme';

export default function GroupList() {
  const { theme } = useTheme();
  const getColor = useColor();
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
              <MaterialCommunityIcons
                name="account-multiple-plus"
                size={28}
                color={getColor('textWhite')}
              />
            </Pressable>
          }
        />
      ),
    });
  }, [navigation]);

  return (
    <View className="flex-1 px-4">
      {/* Search */}
      <View
        className="mb-4 h-11 flex-row items-center rounded-full border px-3"
        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
        <Ionicons name="search" size={18} color={getColor('muted')} />
        <TextInput
          placeholder="Search groups"
          placeholderTextColor={getColor('muted')}
          value={q}
          onChangeText={setQ}
          style={{ color: theme.colors.textPrimary }}
          className="ml-2 flex-1 text-[15px]"
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
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
      <NewGroupSheet open={openNewGroupSheet} onClose={() => setOpenNewGroupSheet(false)} />
    </View>
  );
}
