import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import TransactionCard from '@/components/TransactionCard';
import {
  useAddTransactionComment,
  useTransactionDetails,
} from '@/features/groups/hooks/transactions';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';

export default function GroupTransactionDetail() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const { theme } = useTheme();
  const currentUser = useAtomValue(userAtom);
  const { data: tx, isFetching } = useTransactionDetails(txId);
  const addComment = useAddTransactionComment();
  const [text, setText] = useState('');

  const handleAddComment = () => {
    if (!text.trim()) return;
    addComment.mutate({ transaction_id: txId!, created_by: currentUser?.id!, body: text });
    setText('');
  };

  if (isFetching)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );

  if (!tx)
    return (
      <View className="p-4">
        <Text className="text-red-500">Transaction not found</Text>
      </View>
    );

  return (
    <View className="flex-1">
      <View className="p-4">
        <Text className="text-lg font-semibold">{tx.title}</Text>
        <Text className="mt-1 text-gray-500">
          Paid by {tx.paidByName} on {tx.date}
        </Text>
        <Text className="text-primary mt-3 text-3xl font-bold">₹{tx.amount}</Text>

        <Text className="mt-5 text-base font-semibold">Participants</Text>
        {tx.participants.map((p) => (
          <TransactionCard
            key={p.userId}
            title={p.userId === currentUser?.id ? 'You' : (p.name ?? 'Member')}
            subtitle={p.userId === tx.paidBy ? 'Paid' : 'Owes'}
            amount={p.amount}
            compact
          />
        ))}

        <Text className="mb-2 mt-6 text-base font-semibold">Comments</Text>
        <FlatList
          data={tx.comments}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View className="mb-3 rounded-2xl bg-gray-100 p-3">
              <Text className="font-semibold text-gray-800">{item.user}</Text>
              <Text className="mt-1 text-gray-700">{item.message}</Text>
              <Text className="mt-1 text-xs text-gray-400">{item.createdAt.slice(0, 10)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text className="text-gray-400">No comments yet</Text>}
        />
      </View>

      {/* Add comment input */}
      <KeyboardAvoidingView behavior="padding">
        <View className="flex-row items-center border-t border-gray-200 bg-white p-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-full bg-gray-50 px-4 py-2 text-base text-gray-800"
          />
          <Pressable onPress={handleAddComment} className="ml-2 rounded-full bg-indigo-600 p-3">
            <Ionicons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
