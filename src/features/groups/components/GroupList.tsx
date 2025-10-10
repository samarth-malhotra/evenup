// import groups from '@/app/(tabs)/groups';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import type { TransactionStatus } from '@/components/TransactionCard';
import TransactionCard from '@/components/TransactionCard';
import NewGroupSheet from '@/features/groups/components/BottomSheet/CreateGroupSheet';
// import { groups } from '@/features/groups/mocks/groupList';
import { useUserGroups } from '@/services/hooks/useUserGroups';
import { groupsAtom, selectedGroupIdAtom } from '@/stores/atoms/groups';
import { userAtom } from '@/stores/atoms/user';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';

export type GroupMember = {
  id: string;
  name: string;
  phone_hash: string | null;
  email_hash: string | null;
};

export type Group = {
  avatar_url: string | null;
  created_at: string;
  created_by: string;
  group_name: string;
  id: string;
  simplified: boolean;
  status: string;
  updated_at: string;
  members: GroupMember[] | [];
  owner: GroupMember;
};

export default function GroupList() {
  const { theme } = useTheme();
  const getColor = useColor();
  const navigation = useNavigation();
  const [q, setQ] = useState('');
  const [openNewGroupSheet, setOpenNewGroupSheet] = useState(false);
  // const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useAtom<Group[]>(groupsAtom);
  const setSelectedGroupId = useSetAtom(selectedGroupIdAtom);
  const user = useAtomValue(userAtom);
  const { data, isLoading, isError, error: ApiError, refetch } = useUserGroups(user?.id);

  // const filtered = useMemo(() => {
  //   const t = q.trim().toLowerCase();
  //   if (!t) return groups;
  //   return groups.filter((g) => g.title.toLowerCase().includes(t));
  // }, [q]);

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

  useEffect(() => {
    if (data) setGroups(data);
    if (isError) {
      setError(ApiError.message);
    }
  }, [ApiError, data, isError, setGroups]);
  console.log('is loading: ', isLoading, groups);
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
        data={groups}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text>No Groups, please add</Text>}
        renderItem={({ item }) => (
          <TransactionCard
            className="mx-2 mb-2"
            onPress={() => {
              setSelectedGroupId(item.id);
              router.push(`/(tabs)/groups/${item.id}`);
            }}
            title={item.group_name}
            subtitle={''}
            avatarInitials={item.group_name}
            img={item.avatar_url ?? ''}
            amount={'100'}
            status={item.status as TransactionStatus}
          />
        )}
      />
      {/* Create New Group Bottom Sheet */}
      <NewGroupSheet open={openNewGroupSheet} onClose={() => setOpenNewGroupSheet(false)} />
    </View>
  );
}
