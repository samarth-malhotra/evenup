// import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
// import { useCallback, useLayoutEffect, useState } from 'react';
// import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

// import AddBillSheet from '@/lib/bills/components/AddBillSheet';
// import AppHeader from '@/lib/shared/components/AppHeader';
// import SummaryCard from '@/lib/shared/components/SummaryCard';
// import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
// import TransactionCard from '@/lib/shared/components/TransactionCard';
// import { formatRs } from '@/lib/shared/utils/utils';

// import { getBoxShadow } from '@/hooks/getBoxShadow';
// import { useColor } from '@/lib/shared/utils/color';
// import { useTheme } from '@/theme/ThemeProvider';
// import { groupExpense } from '../mocks/groupList';
// import { selectGroup } from '../util';

// // ---------------- Types ----------------
// export type Member = {
//   id: string;
//   name: string;
//   avatar?: string;
// };

// export type Expense = {
//   id: string;
//   groupId: string;
//   title: string;
//   amount: number;
//   paidBy: string;
//   date: string;
//   category?: string;
//   splits: Record<string, number>;
// };

// // ---------------- Screen ----------------
// export default function GroupDetailScreen() {
//   const { theme } = useTheme();
//   const getColor = useColor();
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const navigation = useNavigation();
//   const router = useRouter();

//   const group = selectGroup(id);

//   const [addOpen, setAddOpen] = useState(false);
//   // ---------------- Header ----------------
//   useLayoutEffect(() => {
//     navigation.setOptions({
//       headerShown: true,
//       header: () => (
//         <AppHeader
//           title={group?.name ?? 'Group'}
//           showBackButton
//           rightActions={
//             <View className="flex-row gap-4">
//               <Pressable onPress={handleSettleUp} accessibilityLabel="Settle up">
//                 <MaterialCommunityIcons name="hand-coin" size={28} color={getColor('textWhite')} />
//               </Pressable>
//               <Pressable onPress={handleSetting} accessibilityLabel="Settings">
//                 <MaterialCommunityIcons
//                   name="account-cog-outline"
//                   size={28}
//                   color={getColor('textWhite')}
//                 />
//               </Pressable>
//             </View>
//           }
//         />
//       ),
//     });
//   }, [navigation, group?.name]);

//   // ---------------- Handlers ----------------
//   const handleSettleUp = () => {
//     router.push({ pathname: `/groups/${id}/settle-up`, params: { groupId: id as string } });
//   };

//   const handleSetting = () => {
//     router.push({ pathname: `/groups/${id}/settings`, params: { groupId: id as string } });
//   };

//   const openPaidByPicker = useCallback(async () => 'Anita', []);
//   const openParticipantsPicker = useCallback(async () => ['You', 'Anita', 'Rohit'], []);

//   // ---------------- Render ----------------
//   return (
//     <ThemedSafeArea className="mt-2 flex-1 ">
//       <View className="flex-row justify-evenly gap-3 px-4">
//         <SummaryCard title="Total Spent" value={formatRs(2000)} type="total" />
//         <SummaryCard title="You Owe" value={formatRs(1500)} type="you" />
//         <SummaryCard title="Friends Owe" value={formatRs(500)} type="friend" />
//       </View>

//       {/* Transactions Header */}
//       <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
//         <Text className="text-base font-semibold">Transactions</Text>
//         <View className="flex-row items-center gap-1">
//           <Ionicons name="arrow-down" size={14} />
//           <Text style={{ color: theme.colors.textSecondary }} className="text-xs">
//             Latest first
//           </Text>
//         </View>
//       </View>

//       {/* Transactions List */}
//       <FlatList
//         className="px-4"
//         showsVerticalScrollIndicator={false}
//         data={groupExpense}
//         keyExtractor={(e) => e.id}
//         renderItem={({ item }) => {
//           return (
//             <TransactionCard
//               onPress={() => router.push(`/groups/${id}/transactions/${item.id}`)}
//               title={item.title}
//               subtitle={`Paid by - ${item.paidBy} @ ${item.createdAt}`}
//               avatarInitials={item.avatarInitials}
//               amount={item.amount}
//               status={item.status}
//               hasAttachment={item.hasAttachment}
//             />
//           );
//         }}
//       />

//       {/* Floating Action Button */}
//       <TouchableOpacity
//         activeOpacity={0.9}
//         onPress={() => setAddOpen(true)}
//         className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full"
//         style={[{ backgroundColor: theme.colors.primary.DEFAULT }, getBoxShadow('md')]}
//         accessibilityLabel="Add expense">
//         <Ionicons name="add" size={28} color={getColor('textWhite')} />
//       </TouchableOpacity>

//       <AddBillSheet
//         open={addOpen}
//         onClose={() => setAddOpen(false)}
//         onSave={(payload) => {
//           // Persist bill
//           console.log('SAVE BILL', payload);
//         }}
//         onSelectPaidBy={openPaidByPicker}
//         onSelectParticipants={openParticipantsPicker}
//       />
//     </ThemedSafeArea>
//   );
// }

// src/features/groups/GroupDetailScreen.tsx
import { useAddExpense } from '@/features/groups/mutations';
import { useExpenses } from '@/features/groups/queries';
import { userAtom } from '@/stores/atoms/user';
import { Expense } from '@/types';
import { useRoute } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Expects route.params = { groupId: string, groupName?: string }
 */
export default function GroupDetailScreen() {
  const route = useRoute();
  // @ts-ignore - match your navigator typing or cast properly
  const { groupId, groupName } = route.params as { groupId: string; groupName?: string };

  const user = useAtomValue(userAtom); // persisted jotai atom for current user
  const { data: expenses, isLoading, isError, refetch } = useExpenses(groupId);
  // const addExpenseMutation = useAddExpense(groupId);
  const { mutateAsync: addExpense, isLoading: isAdding } = useAddExpense(groupId);
  // const isAdding = status === 'loading';
  // local form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onAddExpense() {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      // simple validation
      return;
    }
    // if (!user) {
    //   // should redirect to login or show a toast
    //   return;
    // }

    const payload: Partial<Expense> = {
      amount: Number(amount),
      description,
      payerId: user?.id ?? 'U12',
    };

    setIsSubmitting(true);
    try {
      await addExpense(payload);
      // clear form on success
      setAmount('');
      setDescription('');
      Keyboard.dismiss();
    } catch (e) {
      // handle error (toast/snackbar)
      console.warn('Add expense failed', e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="bg-background flex-1 px-4 py-6">
      <Text className="mb-2 text-2xl font-semibold">{groupName ?? 'Group'}</Text>

      {/* Add expense form */}
      <View className="mb-4">
        <Text className="text-muted mb-1 text-sm">Add expense</Text>
        <TextInput
          placeholder="Amount"
          value={amount}
          keyboardType="numeric"
          onChangeText={setAmount}
          className="mb-2 rounded-xl border border-gray-200 px-3 py-2"
        />
        <TextInput
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          className="mb-2 rounded-xl border border-gray-200 px-3 py-2"
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAddExpense}
          className="bg-primary items-center justify-center rounded-xl px-4 py-3"
          disabled={isSubmitting || isAdding}>
          {isSubmitting || isAdding ? (
            <ActivityIndicator />
          ) : (
            <Text className="bg-blue-700 font-semibold text-white">Add Expense</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Expenses list */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="text-muted mt-2 text-sm">Loading expenses...</Text>
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-red-500">Failed to load expenses</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="mt-3 rounded bg-gray-200 px-3 py-2">
              <Text>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={expenses ?? []}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => <ExpenseRow item={item} />}
            ListEmptyComponent={() => (
              <View className="mt-10 items-center">
                <Text className="text-muted text-sm">No expenses yet — add the first one.</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

/* Small row component for expense */
function ExpenseRow({ item }: { item: Expense }) {
  return (
    <View className="bg-card flex-row items-start justify-between rounded-2xl p-4">
      <View className="flex-1 pr-3">
        <Text className="font-medium">{item.description || 'Expense'}</Text>
        <Text className="text-muted mt-1 text-xs">
          {new Date(item.createdAt ?? '').toLocaleString()}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-semibold">₹{item.amount}</Text>
        <Text className="text-muted mt-1 text-xs">payer: {item.payerId}</Text>
      </View>
    </View>
  );
}
