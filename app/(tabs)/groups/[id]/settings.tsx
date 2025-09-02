import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
// import { ThemedSafeArea } from "@/components/ThemedSafeArea";

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ThemedSafeArea className="flex-1 bg-white dark:bg-black">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="mb-4 text-lg font-semibold">Group Settings</Text>

        {/* Change group name */}
        <Pressable
          onPress={() => router.push(`/groups/${id}/rename`)}
          className="border-b border-gray-200 py-3">
          <Text className="text-base">Change group name</Text>
        </Pressable>

        {/* Add people */}
        <Pressable
          onPress={() => router.push(`/groups/${id}/new-member`)}
          className="border-b border-gray-200 py-3">
          <Text className="text-base">Add people to group</Text>
        </Pressable>

        {/* Members list */}
        <View className="border-b border-gray-200 py-3">
          <Text className="mb-2 text-sm text-gray-500">People in group</Text>
          {/* Replace with real members */}
          <Text className="text-base">• You</Text>
          <Text className="text-base">• Anita</Text>
          <Text className="text-base">• Rohit</Text>
        </View>

        {/* Simplified group debts */}
        <Pressable className="border-b border-gray-200 py-3">
          <Text className="text-base">Simplified group debts</Text>
        </Pressable>

        {/* Leave group */}
        <Pressable className="border-b border-gray-200 py-3">
          <Text className="text-base">Leave group</Text>
        </Pressable>

        {/* Delete group */}
        <Pressable className="py-3">
          <Text className="text-base text-red-600">Delete group</Text>
        </Pressable>
      </ScrollView>
    </ThemedSafeArea>
  );
}
