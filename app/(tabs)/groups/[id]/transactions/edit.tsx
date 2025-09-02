import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
// import { ThemedSafeArea } from "@/components/ThemedSafeArea";

export default function EditTransaction() {
  const { id, txId } = useLocalSearchParams<{ id: string; txId: string }>();
  const router = useRouter();

  // Mock existing values
  const [title, setTitle] = useState('Dinner at beach shack');
  const [amount, setAmount] = useState('1200');

  const handleSave = () => {
    // TODO: update transaction in your store/db
    console.log('Saving:', { id, txId, title, amount });
    router.back();
  };

  return (
    <ThemedSafeArea className="flex-1 bg-white p-4 dark:bg-black">
      <Text className="mb-3 text-lg font-semibold">Edit Transaction</Text>

      <Text className="mb-1 text-sm text-gray-500">Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        className="mb-4 rounded-lg border px-3 py-2"
      />

      <Text className="mb-1 text-sm text-gray-500">Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        className="mb-6 rounded-lg border px-3 py-2"
      />

      <Pressable onPress={handleSave} className="items-center rounded-lg bg-indigo-600 py-3">
        <Text className="font-medium text-white">Save Changes</Text>
      </Pressable>
    </ThemedSafeArea>
  );
}
