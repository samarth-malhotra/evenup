// app/groups/new.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

export default function NewGroupScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // Always include creator ("You") as default
  const [members, setMembers] = useState<string[]>(['You', 'Anita', 'Rohit']);

  const handleCreate = () => {
    console.log({ name, image, members });
    // TODO: integrate create group API/store
  };

  const removeMember = (member: string) => {
    if (member === 'You') return; // cannot remove creator
    setMembers((prev) => prev.filter((m) => m !== member));
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Create Group" showBackButton />,
    });
  }, [navigation]);

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        {/* Group Info */}
        <View className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-700">Group Info</Text>

          {/* Group Avatar */}
          <Pressable
            onPress={() => console.log('TODO: open image picker')}
            className="mb-4 self-center">
            {image ? (
              <Image source={{ uri: image }} className="h-20 w-20 rounded-full" />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-200">
                <MaterialIcons name="group" size={32} color="#6B7280" />
              </View>
            )}
            <Text className="mt-2 text-center text-sm text-indigo-600">
              {image ? 'Change Image' : 'Add Image'}
            </Text>
          </Pressable>

          {/* Group Name */}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name (e.g. Goa Trip)"
            placeholderTextColor="#9CA3AF"
            className="rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800"
          />
        </View>

        {/* Members */}
        <View className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-700">Members</Text>
          <Pressable
            onPress={() => console.log('TODO: open members picker')}
            className="flex-row items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <Text className="text-gray-400">Add members</Text>
            <MaterialIcons name="person-add" size={22} color="#6B7280" />
          </Pressable>

          {/* Selected Members Chips */}
          {members.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {members.map((m) => (
                <View
                  key={m}
                  className="flex-row items-center rounded-full bg-indigo-50 px-3 py-1.5">
                  <Text className="mr-2 text-sm font-medium text-indigo-700">{m}</Text>
                  {m !== 'You' && (
                    <Pressable onPress={() => removeMember(m)} hitSlop={10}>
                      <MaterialIcons name="close" size={16} color="#4F46E5" />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View className="absolute bottom-4 left-4 right-4">
        <TouchableOpacity
          onPress={handleCreate}
          className="rounded-full bg-indigo-600 py-4 shadow-lg active:bg-indigo-700">
          <Text className="text-center text-lg font-semibold text-white">Create Group</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
