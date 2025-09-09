import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import AddBillSheet from '@/lib/bills/components/AddBillSheet';
import CreateGroupSheet from '@/lib/groups/components/BottomSheet/CreateGroupSheet';
import { groups } from '@/lib/groups/mocks/groupList';
import AppHeader from '@/lib/shared/components/AppHeader';
import { Avatar } from '@/lib/shared/components/Avatar';
import Card from '@/lib/shared/components/Card';
import SummaryCard from '@/lib/shared/components/SummaryCard';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import { getColor } from '@/lib/shared/utils/color';
import { formatRs } from '@/lib/shared/utils/utils';

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
  {
    id: 'add',
    label: 'Add Bill',
    icon: <Ionicons name="flash" size={22} />,
    // link: '/bills/addBill',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <MaterialIcons name="bar-chart" size={22} />,
    link: '../summary',
  },
  {
    id: 'group',
    label: 'Create Group',
    icon: <Feather name="plus" size={22} />,
    // link: '/(tabs)/groups/new',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [addOpen, setAddOpen] = useState(false);
  const [openCreateGroupSheet, setOpenCreateGroupSheet] = useState(false);
  const openPaidByPicker = useCallback(async () => 'Anita', []);
  const openParticipantsPicker = useCallback(async () => ['You', 'Anita', 'Rohit'], []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title="Hi, Rohan 👋"
          showBackButton={false}
          rightActions={
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications" size={24} color={getColor('surface')} />
            </TouchableOpacity>
          }
        />
      ),
    });
  }, [navigation]);

  return (
    <ThemedSafeArea scroll edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Summary Row with 3 cards */}
        <SectionHeader title="Summary (in August)" />
        <View className="mb-4 flex-row gap-2 space-x-3 px-4">
          <SummaryCard title="Total Spent" value={formatRs(2000)} type="total" />
          <SummaryCard title="You Owe" value={formatRs(1500)} type="you" />
          <SummaryCard title="Friends Owe" value={formatRs(500)} type="friend" />
        </View>

        {/* Quick Links */}
        <SectionHeader title="Quick links" />
        <View className="mb-4 flex-row justify-center gap-4 px-4">
          {quickLinks.map((q) => (
            <Card key={q.id} className="flex-1 rounded-2xl px-4  py-5">
              <TouchableOpacity
                className="flex items-center justify-center"
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
                <View className="mb-2 h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  {q.icon}
                </View>
                <Text className="text-center text-[15px] font-semibold text-gray-900">
                  {q.label}
                </Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Groups */}
        <SectionHeader title="Groups" />
        {groups.length > 0 ? (
          <ScrollView className="mb-4" horizontal showsHorizontalScrollIndicator={false}>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                className="items-center"
                onPress={() => router.push(`/(tabs)/groups/${g.id}`)}>
                {/* <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow">
                  <Image source={{ uri: g.img }} className="h-[72px] w-[72px] rounded-full" />
                </View> */}
                <Avatar name={g.title} imageUri={g.img} size={64} />
                <Text className="mt-2 w-[90px] text-center text-gray-900" numberOfLines={1}>
                  {g.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text className="mb-4 px-4 italic text-gray-500">
            No groups yet 🚀 Create one to get started!
          </Text>
        )}

        {/* Recent Activity */}
        <SectionHeader title="Recent Activity" />
        <View className="mb-4 px-4">
          {recentActivity.map((a) => (
            <View key={a.id} className="flex-row items-center border-b border-gray-200 py-3">
              <Image source={{ uri: a.avatar }} className="mr-3 h-11 w-11 rounded-full" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">{a.title}</Text>
                <Text className="text-sm text-gray-500">{a.sub}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push('/activity')} className="py-3">
            <Text className="text-center font-semibold text-indigo-600">View All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Add New Bill */}
      <AddBillSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => {
          // Persist bill
          console.log('SAVE BILL', payload);
        }}
        onSelectPaidBy={openPaidByPicker}
        onSelectParticipants={openParticipantsPicker}
      />
      {/* Create New Group Bottom Sheet */}
      <CreateGroupSheet
        open={openCreateGroupSheet}
        onClose={() => setOpenCreateGroupSheet(false)}
        onCreate={(payload) => {
          // handle create here
          console.log('create group', payload);
        }}
      />
      <TransactionsDemoScreen />
    </ThemedSafeArea>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between px-4">
      <Text className="text-lg font-bold text-gray-900">{title}</Text>
    </View>
  );
}
