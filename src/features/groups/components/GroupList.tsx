// import groups from '@/app/(tabs)/groups';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import TransactionCard from '@/components/TransactionCard';
import CreateGroupBottomSheet from '@/features/groups/components/BottomSheet/CreateGroupSheet';
import { useGroupsList } from '@/features/groups/hooks/useGroupsList';
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
        renderItem={({ item }) => (
          <TransactionCard
            className="mx-2 mb-2"
            onPress={() => {
              router.push(`/(tabs)/groups/${item.id}`);
            }}
            title={item.name}
            subtitle={''}
            avatarInitials={item.name}
            img={item.avatar_url ?? ''}
            amount={'100'}
            // status={item.status as unknown as TransactionStatus}
          />
        )}
      />
      {/* Create New Group Bottom Sheet */}
      <CreateGroupBottomSheet
        open={openNewGroupSheet}
        onClose={() => setOpenNewGroupSheet(false)}
      />
    </View>
  );
}
