// app/groups/new.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import BottomSheet from '@/lib/shared/components/BottomSheet';

import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: { name: string; image: string | null; members: string[] }) => void;
};

export default function NewGroupSheet({ open, onClose, onCreate }: Props) {
  const sheetRef = useRef<BottomSheetModalType>(null);

  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  // Always include creator ("You") as default
  const [members, setMembers] = useState<string[]>(['You', 'Anita', 'Rohit']);

  // present / dismiss with the prop
  useEffect(() => {
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  const handleCreate = () => {
    const payload = { name: name.trim(), image, members };
    onCreate?.(payload);
    onClose();
  };

  const removeMember = (member: string) => {
    if (member === 'You') return; // cannot remove creator
    setMembers((prev) => prev.filter((m) => m !== member));
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Title */}
      <Text className="mb-3 text-center text-lg font-semibold text-gray-900">Create Group</Text>

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
          returnKeyType="done"
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
              <View key={m} className="flex-row items-center rounded-full bg-indigo-50 px-3 py-1.5">
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

      {/* Create Button */}
      <TouchableOpacity
        onPress={handleCreate}
        className="rounded-full bg-indigo-600 py-4 shadow-lg active:bg-indigo-700">
        <Text className="text-center text-lg font-semibold text-white">Create Group</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
