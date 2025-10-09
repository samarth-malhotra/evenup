import { Feather, MaterialIcons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
// import { mockFriends } from '@/features/friends/mock';
// import { User } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
};

type User = { id: string; name: string; avatar?: string };

const mockFriends: User[] = [
  { id: 'u1', name: 'You' },
  { id: 'u2', name: 'Anita' },
  { id: 'u3', name: 'Rohit' },
  { id: 'u4', name: 'Sneha' },
  { id: 'u5', name: 'Ramesh' },
];
export default function UpdateMemberSheet({ open, onClose }: Props) {
  //   const sheetRef = useRef<BottomSheetModalType>(null);
  const [tempSelected, setTempSelected] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>(
    mockFriends.filter((f) => ['u1', 'u2', 'u3'].includes(f.id))
  );
  const friends = useMemo(() => mockFriends, []);
  console.log('openL ', open);
  const removeTemp = (id: string) => setTempSelected((prev) => prev.filter((m) => m.id !== id));
  const toggleTemp = (u: User) =>
    setTempSelected((prev) =>
      prev.find((m) => m.id === u.id) ? prev.filter((m) => m.id !== u.id) : [...prev, u]
    );
  //   useEffect(() => {
  //     if (open) sheetRef.current?.present();
  //     else sheetRef.current?.dismiss();
  //   }, [open]);
  const saveMemberChanges = () => {
    setMembers([...tempSelected]);
    // setMembersSheetOpen(false);
    onClose();
    // TODO: persist to store/API
  };
  //   const [isMembersSheetOpen, setMembersSheetOpen] = useState(open);

  return (
    <BottomSheet open={open} onClose={onClose} avoidScrollView>
      <BottomSheetFlatList
        ListHeaderComponent={
          <View className="px-4 pb-3">
            <Text className="mb-2 text-lg font-semibold">Add / Remove people</Text>

            {/* Selected horizontal strip */}
            <FlatList
              data={tempSelected}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => (
                <View key={item.id} className="mr-3 items-center">
                  <View className="relative">
                    <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} className="h-12 w-12" />
                      ) : (
                        <Text className="text-sm font-medium text-gray-700">
                          {item.name[0] ?? 'U'}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => removeTemp(item.id)}
                      className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 shadow">
                      <MaterialIcons name="cancel" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                  <Text className="mt-1 text-xs">{item.name}</Text>
                </View>
              )}
            />
          </View>
        }
        data={friends}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => {
          const checked = !!tempSelected.find((m) => m.id === item.id);
          return (
            <Pressable
              onPress={() => toggleTemp(item)}
              className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} className="h-10 w-10" />
                  ) : (
                    <Text className="text-sm font-medium text-gray-700">{item.name[0] ?? 'U'}</Text>
                  )}
                </View>
                <Text className="text-base">{item.name}</Text>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${checked ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'}`}>
                {checked ? <Feather name="check" size={14} color="white" /> : null}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View className="p-4">
            <Pressable
              onPress={saveMemberChanges}
              className="items-center rounded bg-indigo-600 py-3">
              <Text className="font-semibold text-white">Save</Text>
            </Pressable>
          </View>
        }
      />
    </BottomSheet>
  );
}
