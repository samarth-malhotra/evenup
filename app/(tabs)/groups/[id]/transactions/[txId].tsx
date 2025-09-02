import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';

// import { ThemedSafeArea } from "@/components/ThemedSafeArea";
import AppHeader from '@/lib/shared/components/AppHeader';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import { useNavigation } from '@react-navigation/native';

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

  const handleAddComment = () => {
    if (!comment.trim()) return;
    // TODO: push comment to store/db
    console.log('New comment:', comment);
    setComment('');
  };

  const handleEdit = () => {
    router.push(`/groups/${id}/transactions/edit`);
  };
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Transaction Details" showBackButton />,
    });
  }, [navigation]);

  return (
    <ThemedSafeArea className="flex-1 bg-white dark:bg-black">
      {/* Summary */}
      <View className="border-b border-gray-200 p-4 dark:border-gray-800">
        <Text className="text-lg font-semibold">{mockTransaction.title}</Text>
        <Text className="text-gray-500">
          {mockTransaction.date} • Paid by {mockTransaction.paidBy}
        </Text>
        <Text className="mt-2 text-2xl font-bold">₹{mockTransaction.amount}</Text>
        <Pressable
          onPress={handleEdit}
          className="mt-3 self-start rounded-full bg-indigo-600 px-4 py-2">
          <Text className="font-medium text-white">Edit Transaction</Text>
        </Pressable>
      </View>

      {/* Participants */}
      <View className="border-b border-gray-200 p-4 dark:border-gray-800">
        <Text className="mb-2 text-base font-semibold">Participants</Text>
        {mockTransaction.participants.map((p) => (
          <View key={p.id} className="flex-row justify-between py-1">
            <Text>{p.name}</Text>
            <Text className="font-medium">₹{p.owes}</Text>
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
                <Text className="font-medium">{item.user}</Text>
                <Text className="text-gray-600 dark:text-gray-300">{item.message}</Text>
                <Text className="text-xs text-gray-400">{item.date}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </View>

        {/* Input */}
        <View className="flex-row items-center border-t border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-black">
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700"
          />
          <Pressable onPress={handleAddComment} className="ml-2 rounded-full bg-indigo-600 p-2">
            <Ionicons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}
