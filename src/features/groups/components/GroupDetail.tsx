import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import SummaryCard from '@/components/SummaryCard';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import { groupExpense } from '@/features/groups/mocks/groupList';
import { selectGroup } from '@/features/groups/util';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';
import { formatRs } from '@/utils/formatRs';

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
  const { theme } = useTheme();
  const getColor = useColor();
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
                <MaterialCommunityIcons name="hand-coin" size={28} color={getColor('textWhite')} />
              </Pressable>
              <Pressable onPress={handleSetting} accessibilityLabel="Settings">
                <MaterialCommunityIcons
                  name="account-cog-outline"
                  size={28}
                  color={getColor('textWhite')}
                />
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
    <ThemedSafeArea className="mt-2 flex-1 ">
      <View className="flex-row justify-evenly gap-3 px-4">
        <SummaryCard title="Total Spent" value={formatRs(2000)} type="total" />
        <SummaryCard title="You Owe" value={formatRs(1500)} type="you" />
        <SummaryCard title="Friends Owe" value={formatRs(500)} type="friend" />
      </View>

      {/* Transactions Header */}
      <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
        <Text className="text-base font-semibold">Transactions</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="arrow-down" size={14} />
          <Text style={{ color: theme.colors.textSecondary }} className="text-xs">
            Latest first
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        className="px-4"
        showsVerticalScrollIndicator={false}
        data={groupExpense}
        keyExtractor={(e) => e.id}
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
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full"
        style={[{ backgroundColor: theme.colors.primary.DEFAULT }, getBoxShadow('md')]}
        accessibilityLabel="Add expense">
        <Ionicons name="add" size={28} color={getColor('textWhite')} />
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
