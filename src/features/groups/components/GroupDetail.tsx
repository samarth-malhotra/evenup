import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import SummaryCard from '@/components/SummaryCard';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import { groupExpense } from '@/features/groups/mocks/groupList';
import { selectedGroupAtom, selectedGroupIdAtom } from '@/stores/atoms/groups';
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
  // const { id, isNewgroup } = useLocalSearchParams<{ id: string; isNewgroup?: string }>();
  const { theme } = useTheme();
  const getColor = useColor();
  const selectedGroupId = useAtomValue(selectedGroupIdAtom);
  const selectedGroup = useAtomValue(selectedGroupAtom);
  // const { id, isNewgroup } = useLocalSearchParams<{ id: string; isNewgroup: boolean }>();
  const navigation = useNavigation();
  const router = useRouter();
  const transactions = [];

  // const group = selectGroup(id);

  const [addOpen, setAddOpen] = useState(false);

  // ---------------- Handlers ----------------
  const handleSettleUp = () => {
    router.push({ pathname: `/groups/${selectedGroupId}/settle-up`, params: { selectedGroupId } });
  };

  const handleSetting = () => {
    router.push({ pathname: `/groups/${selectedGroupId}/settings`, params: { selectedGroupId } });
  };

  // ---------------- Header ----------------
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={selectedGroup?.group_name ?? 'Group'}
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
  }, [navigation, selectedGroup?.group_name, handleSettleUp, getColor, handleSetting]);

  // remove
  // clearMatchCache();

  const openPaidByPicker = useCallback(async () => 'Anita', []);
  const openParticipantsPicker = useCallback(async () => ['You', 'Anita', 'Rohit'], []);
  // const [isMembersSheetOpen, setMembersSheetOpen] = useState(false);
  console.log(
    'Group Details - memeber: ',
    selectedGroup,
    selectedGroup?.members?.length,
    selectedGroup?.owner.name
  );
  console.log('Group Details - selectedGroupId: ', selectedGroupId);

  // ---------------- Render ----------------
  return (
    <View className="mt-2 flex-1">
      {selectedGroup && selectedGroup.members.length > 0 ? (
        <View className="mt-2 flex-1 ">
          {transactions.length ? (
            <>
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
                      onPress={() =>
                        router.push(`/groups/${selectedGroupId}/transactions/${item.id}`)
                      }
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
            </>
          ) : (
            <View className="px-4 text-center">
              <Text className="text-base font-semibold">No Transcations</Text>
              <Pressable
                className="flex-row items-center justify-between py-4"
                onPress={() => setAddOpen(true)}>
                <View>
                  <Text className="text-base">Add New Trasncation</Text>
                </View>
              </Pressable>
            </View>
          )}
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
        </View>
      ) : (
        <View className="flex h-full justify-center px-4 align-middle">
          <Text className="text-base font-semibold">You have created new groug</Text>
          <Pressable
            className="flex-row items-center justify-between py-4"
            onPress={() =>
              router.push({
                pathname: `/groups/${selectedGroupId}/add-members`,
                params: { selectedGroupId },
              })
            }>
            <View>
              <Text className="text-base">Add Members</Text>
            </View>
          </Pressable>
          {/* <AddMemberSheet open={isMembersSheetOpen} onClose={() => setMembersSheetOpen(false)} /> */}
        </View>
      )}
    </View>
  );
}
