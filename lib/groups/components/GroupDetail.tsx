import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

import AddBillSheet from '@/lib/bills/components/AddBillSheet';
import AppHeader from '@/lib/shared/components/AppHeader';
import SummaryCard from '@/lib/shared/components/SummaryCard';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import TransactionCard from '@/lib/shared/components/TransactionCard';
import { formatRs } from '@/lib/shared/utils/utils';
import { COLORS } from '@/theme/color';

import { groupExpense } from '../mocks/groupList';
import { selectGroup } from '../util';

// ---------------- Types ----------------
export type Member = {
  id: string;
  name: string;
  avatar?: string;
};

export type Expense = {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  category?: string;
  splits: Record<string, number>;
};

// ---------------- Screen ----------------
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const group = selectGroup(id);

  const [addOpen, setAddOpen] = useState(false);
  // ---------------- Header ----------------
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={group?.name ?? 'Group'}
          showBackButton
          rightActions={
            <View className="flex-row gap-4">
              <Pressable onPress={handleSettleUp} accessibilityLabel="Settle up">
                <MaterialCommunityIcons name="hand-coin" size={28} color="#fff" />
              </Pressable>
              <Pressable onPress={handleSetting} accessibilityLabel="Settings">
                <MaterialCommunityIcons name="account-cog-outline" size={28} color="#fff" />
              </Pressable>
            </View>
          }
        />
      ),
    });
  }, [navigation, group?.name]);

  // ---------------- Handlers ----------------
  const handleSettleUp = () => {
    router.push({ pathname: `/groups/${id}/settle-up`, params: { groupId: id as string } });
  };

  const handleSetting = () => {
    router.push({ pathname: `/groups/${id}/settings`, params: { groupId: id as string } });
  };

  const openPaidByPicker = useCallback(async () => 'Anita', []);
  const openParticipantsPicker = useCallback(async () => ['You', 'Anita', 'Rohit'], []);

  // ---------------- Render ----------------
  return (
    <ThemedSafeArea className="flex-1">
      <View className="px-4">
        <View className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <View className="flex-row gap-3">
            <SummaryCard title="Total Spent" value={formatRs(2000)} type="total" />
            <SummaryCard title="You Owe" value={formatRs(1500)} type="you" />
            <SummaryCard title="Friends Owe" value={formatRs(500)} type="friend" />
          </View>
        </View>
      </View>

      {/* Transactions Header */}
      <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
        <Text className="text-base font-semibold">Transactions</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="arrow-down" size={14} />
          <Text className="text-xs text-gray-600">Latest first</Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={groupExpense}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          return (
            <TransactionCard
              onPress={() => router.push(`/groups/${id}/transactions/${item.id}`)}
              title={item.title}
              subtitle={`Paid by - ${item.paidBy} @ ${item.createdAt}`}
              avatarInitials={item.avatarInitials}
              amount={item.amount}
              status={item.status}
              hasAttachment={item.hasAttachment}
            />
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setAddOpen(true)}
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full shadow-md"
        style={{ backgroundColor: COLORS?.primary ?? '#6366F1' }}
        accessibilityLabel="Add expense">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
    </ThemedSafeArea>
  );
}
