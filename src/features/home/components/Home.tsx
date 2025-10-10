// app/(tabs)/home.tsx
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import SummaryCard from '@/components/SummaryCard';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import CreateGroupSheet from '@/features/groups/components/BottomSheet/CreateGroupSheet';
import { groupsAtom, selectedGroupIdAtom } from '@/stores/atoms/groups';
import { userAtom } from '@/stores/atoms/user';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';
import { formatRs } from '@/utils/formatRs';

import TransactionsDemoScreen from './TransactionDemo';

// Mock recent activity
const recentActivity = [
  {
    id: '1',
    title: 'Paid ₹500 to Office Friends',
    sub: '2 days ago',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: '2',
    title: 'Added ₹1,200 for Family Trip',
    sub: '5 days ago',
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    id: '3',
    title: 'Settled ₹350 with Rahul',
    sub: '1 week ago',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
];

const quickLinks = [
  { id: 'add', label: 'Add Bill', icon: <Ionicons name="flash" size={22} /> },
  {
    id: 'reports',
    label: 'Reports',
    icon: <MaterialIcons name="bar-chart" size={22} />,
    link: '../summary',
  },
  { id: 'group', label: 'Create Group', icon: <Feather name="plus" size={22} /> },
];

export default function HomeScreen() {
  const getColor = useColor();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const groups = useAtomValue(groupsAtom);

  const user = useAtomValue(userAtom);
  const setSelectedGroupId = useSetAtom(selectedGroupIdAtom);

  const [addOpen, setAddOpen] = useState(false);
  const [openCreateGroupSheet, setOpenCreateGroupSheet] = useState(false);

  const openPaidByPicker = useCallback(async () => 'Anita', []);
  const openParticipantsPicker = useCallback(async () => ['You', 'Anita', 'Rohit'], []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={`Hi, ${user?.nickname ?? user?.name} 👋`}
          showBackButton={false}
          rightActions={
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications" size={24} color={getColor('textWhite')} />
            </TouchableOpacity>
          }
        />
      ),
    });
  }, [getColor, navigation, user]);

  return (
    <ThemedSafeArea scroll edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Summary */}
        <SectionHeader title="Summary (in August)" />
        <View className="mb-4 flex-row gap-2 px-4">
          <SummaryCard title="Total Spent" value={formatRs(2000)} type="total" />
          <SummaryCard title="You Owe" value={formatRs(1500)} type="you" />
          <SummaryCard title="Friends Owe" value={formatRs(500)} type="friend" />
        </View>

        {/* Quick Links */}
        <SectionHeader title="Quick links" />
        <View className="mb-4 flex-row justify-center gap-4 px-4">
          {quickLinks.map((q) => (
            <View
              key={q.id}
              style={[getBoxShadow('sm'), { borderRadius: 16, backgroundColor: theme.colors.card }]}
              className="flex-1">
              <TouchableOpacity
                className="items-center rounded-2xl px-4 py-5" // inner card draw
                onPress={() => {
                  if (q.id === 'add') {
                    setAddOpen(true);
                  } else if (q.id === 'group') {
                    setOpenCreateGroupSheet(true);
                  } else {
                    router.push(q.link!);
                  }
                }}
                activeOpacity={0.85}>
                <View
                  style={{ backgroundColor: theme.colors.highlight }}
                  className="mb-2 h-9 w-9 items-center justify-center rounded-lg">
                  {q.icon}
                </View>
                <Text
                  style={{ color: theme.colors.textPrimary }}
                  className="text-center text-[15px] font-semibold">
                  {q.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Groups */}
        <SectionHeader title="Groups" />
        {groups.length > 0 ? (
          <ScrollView className="mb-4 pl-2" horizontal showsHorizontalScrollIndicator={false}>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                className="items-center"
                onPress={() => {
                  setSelectedGroupId(g.id);
                  router.push(`/(tabs)/groups/${g.id}`);
                }}>
                <Avatar name={g.group_name} imageUri={g.avatar_url ?? ''} size={64} />
                <Text
                  style={{ color: theme.colors.textPrimary }}
                  className="mt-2 w-[90px] text-center"
                  numberOfLines={1}>
                  {g.group_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={{ color: theme.colors.textSecondary }} className="mb-4 px-4 italic">
            No groups yet 🚀 Create one to get started!
          </Text>
        )}

        {/* Recent Activity */}
        <SectionHeader title="Recent Activity" />
        <View className="mb-4 px-4">
          {recentActivity.map((a) => (
            <View
              key={a.id}
              style={{ borderColor: theme.colors.border }}
              className="flex-row items-center border-b py-3">
              <Image source={{ uri: a.avatar }} className="mr-3 h-11 w-11 rounded-full" />
              <View className="flex-1">
                <Text
                  style={{ color: theme.colors.textPrimary }}
                  className="text-base font-semibold">
                  {a.title}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }} className="text-sm">
                  {a.sub}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push('/activity')} className="py-3">
            <Text style={{ color: theme.colors.link }} className="text-center font-semibold ">
              View All
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* // )} */}
      {/* Add New Bill */}
      <AddBillSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => console.log('SAVE BILL', payload)}
        onSelectPaidBy={openPaidByPicker}
        onSelectParticipants={openParticipantsPicker}
      />

      {/* Create Group Bottom Sheet */}
      <CreateGroupSheet
        open={openCreateGroupSheet}
        onClose={() => setOpenCreateGroupSheet(false)}
      />

      {/* Demo Transactions */}
      <TransactionsDemoScreen />
    </ThemedSafeArea>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <View className="mb-4 mt-2 flex-row items-center justify-between px-4">
      <Text style={{ color: theme.colors.textPrimary }} className="text-lg font-bold">
        {title}
      </Text>
    </View>
  );
}
