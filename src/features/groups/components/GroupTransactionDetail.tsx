// app/transactions/[txId].tsx
import AppHeader from '@/components/AppHeader';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import { useColor } from '@/hooks/useColor';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------- MOCK (replace with real store/API) ----------
const mockTransactionBase = {
  id: 'tx1',
  title: 'Dinner at beach shack',
  amount: 1200,
  paidBy: 'Anita',
  paidById: 'u2',
  date: '2025-08-20',
  splitMethod: 'Equal', // "Equal" | "Exact" | "Percent"
  participants: [
    { id: 'me', name: 'You', owes: 400, settled: false },
    { id: 'u2', name: 'Anita', owes: 400, settled: false },
    { id: 'u3', name: 'Rohit', owes: 400, settled: false },
  ],
  comments: [
    { id: 'c1', userId: 'u2', user: 'Anita', message: 'Added this expense', date: '2025-08-20' },
    { id: 'c2', userId: 'u3', user: 'Rohit', message: 'Updated split', date: '2025-08-21' },
  ],
};
// -------------------------------------------------------

export default function GroupTransactionDetail() {
  const { theme } = useTheme();
  const getColor = useColor();

  const { id, txId } = useLocalSearchParams<{ id: string; txId: string }>();
  const navigation = useNavigation();

  // Simulate loading base transaction (replace with selector / api call)
  const [transaction] = useState(mockTransactionBase);

  // Comments local state (optimistic add)
  const [comments, setComments] = useState(transaction.comments ?? []);
  const [commentText, setCommentText] = useState('');

  // Bottom sheet state only used for Edit (kept)
  const [editOpen, setEditOpen] = useState(false);

  // Replace with actual current user id from auth
  const currentUserId = 'me';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title="Transaction Details"
          showBackButton
          rightActions={
            <TouchableOpacity onPress={() => setEditOpen(true)} className="p-2">
              <Ionicons name="create-outline" size={22} color={getColor('textWhite')} />
            </TouchableOpacity>
          }
        />
      ),
    });
  }, [navigation]);

  // Payer (single) and owe list (everyone except payer)
  const payer = useMemo(
    () => transaction.participants.find((p) => p.id === transaction.paidById),
    [transaction]
  );

  const oweList = useMemo(
    () => transaction.participants.filter((p) => p.id !== transaction.paidById),
    [transaction]
  );

  // Friendly split label (static display now)
  const splitLabel = useMemo(() => {
    switch (transaction.splitMethod) {
      case 'Exact':
        return 'Exact amounts';
      case 'Percent':
        return 'Percent split';
      case 'Equal':
      default:
        return 'Equal split';
    }
  }, [transaction.splitMethod]);

  // Optimistic add comment
  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;

    const now = new Date();
    const isoDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const newComment = {
      id: `c_temp_${Date.now()}`,
      userId: currentUserId,
      user: 'You',
      message: text,
      date: isoDate,
      pending: true,
    };

    // Optimistically show
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');

    // Simulate async save
    setTimeout(() => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === newComment.id ? { ...c, id: `c${Date.now()}`, pending: false } : c
        )
      );
    }, 700);
  };

  return (
    <>
      {/* Summary card */}
      <View className="px-4 pt-2">
        <View className="mb-5 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text style={{ color: theme.colors.textPrimary }} className="text-lg font-semibold">
              {transaction.title}
            </Text>

            <View className="mt-1 flex-row items-center space-x-2">
              <Text style={{ color: theme.colors.textSecondary }} className="text-sm">
                {transaction.date}
              </Text>
            </View>

            {/* split method — informational only */}
            <Text
              style={{ color: theme.colors.primary.DEFAULT }}
              className="mt-2 text-sm font-medium">
              {splitLabel}
            </Text>
          </View>

          <View className="items-end">
            <Text
              style={{ color: theme.colors.primary.DEFAULT }}
              className="text-3xl font-extrabold">
              ₹{transaction.amount}
            </Text>
            <Text style={{ color: theme.colors.textSecondary }} className="mt-1 text-sm">
              Total
            </Text>
          </View>
        </View>

        {/* Payer highlighted */}
        {payer ? (
          <View className="mb-2">
            <Text
              style={{ color: theme.colors.textPrimary }}
              className="pb-2 text-base font-semibold">
              Payer
            </Text>
            <TransactionCard
              title="Anita"
              subtitle="Paid"
              avatarInitials="AN"
              amount={800}
              compact
            />
          </View>
        ) : null}

        {/* Owes: show everyone who owes (all participants except payer) */}
        <View className="mb-2">
          <Text
            style={{ color: theme.colors.textPrimary }}
            className="mb-3 text-base font-semibold">
            Owes
          </Text>

          {oweList.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }} className="text-sm">
              No participants owe anything.
            </Text>
          ) : (
            <>
              <TransactionCard
                title="You"
                subtitle="You Owe"
                avatarInitials="SH"
                amount={400}
                compact
              />
              <TransactionCard
                title="Rahul"
                subtitle="Participant"
                avatarInitials="RA"
                amount={400}
                compact
              />
            </>
          )}
        </View>
      </View>

      {/* Comments + Input pinned at bottom */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View className="flex-1">
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View className="mb-3 px-4">
                <View
                  className={`rounded-2xl p-3 ${
                    item.userId === currentUserId ? 'bg-indigo-50' : 'bg-gray-100'
                  }`}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-gray-800">{item.user}</Text>
                    {item.pending ? <Text className="text-xs text-gray-400">Sending…</Text> : null}
                  </View>
                  <Text className="mt-1 text-base text-gray-700">{item.message}</Text>
                  <Text className="mt-1 text-xs text-gray-400">{item.date}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
            ListEmptyComponent={() => (
              <View className="p-4">
                <Text className="text-sm text-gray-500">No comments yet</Text>
              </View>
            )}
          />
        </View>

        <View className="flex-row items-center border-t border-gray-200 bg-white p-3">
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-full bg-gray-50 px-4 py-2 text-base text-gray-800"
          />
          <Pressable onPress={handleAddComment} className="ml-2 rounded-full bg-indigo-600 p-3">
            <Ionicons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Edit Bill Sheet*/}
      <AddBillSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(payload) => {
          // Persist bill
          console.log('SAVE BILL', payload);
        }}
        // onSelectPaidBy={openPaidByPicker}
        // onSelectParticipants={openParticipantsPicker}
      />
    </>
  );
}
