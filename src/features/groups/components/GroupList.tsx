// import groups from '@/app/(tabs)/groups';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import BalanceBadge from '@/features/groups/components/BalanceBadge';
import NewGroupSheet from '@/features/groups/components/BottomSheet/CreateGroupSheet';
import { useGroupsList } from '@/features/groups/hooks/useGroupsList';
import { formatCurrency } from '@/features/groups/utils';
import { userAtom } from '@/stores/atoms/user';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';

export default function GroupList() {
  const { theme } = useTheme();
  const getColor = useColor();
  const navigation = useNavigation();
  const [q, setQ] = useState('');
  const [openNewGroupSheet, setOpenNewGroupSheet] = useState(false);
  const user = useAtomValue(userAtom);
  const {
    data: groupsList,
    isLoading,
    isError,
    error: ApiError,
    refetch,
  } = useGroupsList(user?.id);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title="Group"
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
  }, [getColor, navigation]);

  console.log('Group List: ', isLoading, groupsList?.length);
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text>Loading your groups...</Text>
      </View>
    );
  }
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
        data={groupsList}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text>No Groups, please add</Text>}
        renderItem={({ item }) => {
          const bs = item.balance_summary;
          const net = bs?.net_amount ?? 0;
          const absAmount = bs?.abs_amount ?? Math.abs(net);
          const currency = bs?.currency ?? 'INR';
          // status is 'friends_owe' | 'you_owe' | 'settled'
          const status =
            bs?.status ?? (net === 0 ? 'settled' : net > 0 ? 'friends_owe' : 'you_owe');

          const amountText = formatCurrency(absAmount, currency);

          return (
            <Pressable
              className="mx-2 mb-2"
              onPress={() => {
                router.push(`/(tabs)/groups/${item.id}`);
              }}>
              <View
                className="flex-row items-center justify-between rounded-lg p-3"
                style={{ backgroundColor: theme.colors.card }}>
                <View className="flex-row items-center">
                  {/* Avatar or initials */}
                  <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                    {item.avatar_url ? (
                      // If you have an Image component: <Image source={{uri: item.avatar_url}} style={{width:48, height:48}} />
                      <Text>{/* TODO: show avatar image */}</Text>
                    ) : (
                      <Text className="text-sm font-semibold">
                        {(item.name || '').slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View className="ml-3">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.textPrimary }}>
                      {item.name}
                    </Text>
                  </View>
                </View>

                {/* Right side badge */}
                <BalanceBadge status={status as any} amountText={amountText} />
              </View>
            </Pressable>
          );
        }}
      />
      {/* Create New Group Bottom Sheet */}
      <NewGroupSheet open={openNewGroupSheet} onClose={() => setOpenNewGroupSheet(false)} />
    </View>
  );
}
