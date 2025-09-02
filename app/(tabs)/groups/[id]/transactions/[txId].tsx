import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

// Mock data - replace with store/API
const mockTransaction = {
  id: 'tx1',
  title: 'Dinner at beach shack',
  amount: 1200,
  paidBy: 'Anita',
  date: '2025-08-20',
  participants: [
    { id: 'me', name: 'You', owes: 400 },
    { id: 'u2', name: 'Anita', owes: 400 },
    { id: 'u3', name: 'Rohit', owes: 400 },
  ],
  comments: [
    { id: 'c1', user: 'Anita', message: 'Added this expense', date: '2025-08-20' },
    { id: 'c2', user: 'Rohit', message: 'Updated split', date: '2025-08-21' },
  ],
};

export default function TransactionDetail() {
  const { id, txId } = useLocalSearchParams<{ id: string; txId: string }>();
  const router = useRouter();
  const [comment, setComment] = useState('');
  const navigation = useNavigation();

  const handleAddComment = () => {
    if (!comment.trim()) return;
    // TODO: push comment to store/db
    console.log('New comment:', comment);
    setComment('');
  };

  const handleEdit = () => {
    router.push(`/groups/${id}/transactions/edit`);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Transaction Details" showBackButton />,
    });
  }, [navigation]);

  return (
    <>
      {/* Summary */}
      <View className="m-4 rounded-2xl bg-white p-5 shadow-sm">
        <Text className="text-lg font-semibold text-gray-900">{mockTransaction.title}</Text>
        <Text className="mt-0.5 text-sm text-gray-500">
          {mockTransaction.date} • Paid by {mockTransaction.paidBy}
        </Text>
        <Text className="mt-3 text-3xl font-bold text-indigo-600">₹{mockTransaction.amount}</Text>
        <Pressable
          onPress={handleEdit}
          className="mt-4 self-start rounded-full bg-indigo-600 px-4 py-2">
          <Text className="text-sm font-medium text-white">Edit Transaction</Text>
        </Pressable>
      </View>

      {/* Participants */}
      <View className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
        <Text className="mb-3 text-base font-semibold text-gray-900">Participants</Text>
        {mockTransaction.participants.map((p) => (
          <View
            key={p.id}
            className="flex-row items-center justify-between border-b border-gray-100 py-2 last:border-0">
            <Text className="text-gray-800">{p.name}</Text>
            <Text className="font-semibold text-gray-900">₹{p.owes}</Text>
          </View>
        ))}
      </View>

      {/* Comments + Input pinned at bottom */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View className="flex-1">
          <FlatList
            data={mockTransaction.comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View className="mb-3 px-4">
                <View className="rounded-2xl bg-gray-100 p-3">
                  <Text className="text-sm font-semibold text-gray-800">{item.user}</Text>
                  <Text className="mt-1 text-base text-gray-700">{item.message}</Text>
                  <Text className="mt-1 text-xs text-gray-400">{item.date}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </View>

        {/* Input */}
        <View className="flex-row items-center border-t border-gray-200 bg-white p-3">
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-full bg-gray-50 px-4 py-2 text-base text-gray-800"
          />
          <Pressable onPress={handleAddComment} className="ml-2 rounded-full bg-indigo-600 p-3">
            <Ionicons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
