// app/groups/[id]/settings.tsx
import AppHeader from '@/components/AppHeader';
import BottomSheet from '@/components/BottomSheet';
import { useTheme } from '@/hooks/useTheme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';

type User = { id: string; name: string; avatar?: string };

const mockFriends: User[] = [
  { id: 'u1', name: 'You' },
  { id: 'u2', name: 'Anita' },
  { id: 'u3', name: 'Rohit' },
  { id: 'u4', name: 'Sneha' },
  { id: 'u5', name: 'Ramesh' },
];

export default function GroupSettings() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Group Settings" showBackButton />,
    });
  }, [navigation]);

  // --- group state (replace with EvenUp selectors) ---
  const [groupName, setGroupName] = useState('Trip to Goa');
  const [members, setMembers] = useState<User[]>(
    mockFriends.filter((f) => ['u1', 'u2', 'u3'].includes(f.id))
  );
  const friends = useMemo(() => mockFriends, []);

  // UI state
  const [isMembersSheetOpen, setMembersSheetOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<User[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState(true);

  // Edit name modal state
  const [isEditNameModalOpen, setEditNameModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(groupName);

  // Confirm action modal (leave / delete)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type?: 'leave' | 'delete';
  }>({ visible: false });

  // helpers
  const openMembersSheet = () => {
    setTempSelected([...members]);
    setMembersSheetOpen(true);
  };
  const toggleTemp = (u: User) =>
    setTempSelected((prev) =>
      prev.find((m) => m.id === u.id) ? prev.filter((m) => m.id !== u.id) : [...prev, u]
    );
  const removeTemp = (id: string) => setTempSelected((prev) => prev.filter((m) => m.id !== id));
  const saveMemberChanges = () => {
    setMembers([...tempSelected]);
    setMembersSheetOpen(false);
    // TODO: persist to store/API
  };

  const openConfirmModal = (type: 'leave' | 'delete') => {
    setConfirmModal({ visible: true, type });
  };

  const performConfirmAction = () => {
    const type = confirmModal.type;
    setConfirmModal({ visible: false });
    if (type === 'leave') {
      // TODO: call leave API
      router.back();
    } else if (type === 'delete') {
      // TODO: call delete API
      router.back();
    }
  };

  // Confirm rename from modal
  const confirmRename = () => {
    const name = editedName.trim();
    if (!name) return;
    setGroupName(name);
    setEditNameModalOpen(false);
    // TODO: persist rename
  };

  // Header: static content rendered as FlatList header to avoid nested scroll issues
  const Header = (
    <View className="px-4 pb-2 pt-4">
      {/* Group name row (opens modal when pencil pressed) */}
      <View className="flex-row items-center justify-between py-4">
        <View>
          <Text style={{ color: theme.colors.textSecondary }} className="text-sm">
            Group
          </Text>
          <Text className="text-lg font-semibold">{groupName}</Text>
        </View>

        <Pressable
          accessibilityLabel="Edit group name"
          onPress={() => {
            setEditedName(groupName);
            setEditNameModalOpen(true);
          }}
          className="px-2">
          <Feather name="edit-2" size={20} />
        </Pressable>
      </View>

      {/* Add / Remove people */}
      <Pressable className="flex-row items-center justify-between py-4" onPress={openMembersSheet}>
        <View>
          <Text className="text-base">Add / Remove people</Text>
          <Text className="text-xs text-gray-500">Manage group members</Text>
        </View>
        <Feather name="chevron-right" size={24} color="#6b7280" />
      </Pressable>

      {/* Members preview */}
      <View className="border-b border-gray-200 py-4">
        <Text className="mb-2 text-sm text-gray-500">People in group</Text>
        <View className="flex-row flex-wrap items-center">
          {members.map((m) => (
            <View key={m.id} className="mb-3 mr-3 items-center">
              <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                {m.avatar ? (
                  <Image source={{ uri: m.avatar }} className="h-10 w-10" />
                ) : (
                  <Text className="text-sm font-medium text-gray-700">{m.name[0] ?? 'U'}</Text>
                )}
              </View>
              <Text className="mt-1 text-xs">{m.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Simplified group debts - improved checkbox UI */}
      <View className="flex-row items-center justify-between border-b border-gray-200 py-4">
        <View className="flex-1 pr-3">
          <Text className="text-base">Simplified group debts</Text>
          <Text className="text-xs text-gray-500">
            Reduce number of transactions between members
          </Text>
        </View>

        {/* clearer checkbox square */}
        <Switch
          value={simplifiedDebts}
          onValueChange={setSimplifiedDebts}
          thumbColor={simplifiedDebts ? '#fff' : undefined}
          trackColor={{ false: '#E5E7EB', true: '#6C5CE7' }}
        />
      </View>

      {/* Leave / Delete */}
      <Pressable
        className="border-b border-gray-200 py-4"
        onPress={() => openConfirmModal('leave')}>
        <Text className="text-base">Leave group</Text>
      </Pressable>
      <Pressable className="py-4" onPress={() => openConfirmModal('delete')}>
        <Text className="text-base text-red-600">Delete group</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={Header}
        ListEmptyComponent={<View className="h-1" />}
      />

      {/* ----------------- MEMBERS BOTTOM SHEET (uses avoidScrollView + BottomSheetFlatList) ----------------- */}
      <BottomSheet
        open={isMembersSheetOpen}
        onClose={() => setMembersSheetOpen(false)}
        avoidScrollView>
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
                      <Text className="text-sm font-medium text-gray-700">
                        {item.name[0] ?? 'U'}
                      </Text>
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

      {/* ----------------- EDIT GROUP NAME MODAL ----------------- */}
      <Modal
        visible={isEditNameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameModalOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Edit group name</Text>

            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Group name"
              className="mb-4 rounded border border-gray-200 px-3 py-2"
              autoFocus
            />

            <View className="flex-row justify-end">
              <Pressable onPress={() => setEditNameModalOpen(false)} className="mr-2 px-4 py-2">
                <Text className="text-base text-gray-600">Cancel</Text>
              </Pressable>

              <Pressable onPress={confirmRename} className="rounded bg-indigo-600 px-4 py-2">
                <Text className="text-white">Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ----------------- LEAVE / DELETE CONFIRM MODAL ----------------- */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false })}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-2 text-lg font-semibold">
              {confirmModal.type === 'delete' ? 'Delete group' : 'Leave group'}
            </Text>

            <Text className="mb-4 text-gray-600">
              {confirmModal.type === 'delete'
                ? 'Deleting the group will remove it for everyone. This action cannot be undone.'
                : 'Are you sure you want to leave the group? You will no longer be a member.'}
            </Text>

            <View className="flex-row justify-end">
              <Pressable
                onPress={() => setConfirmModal({ visible: false })}
                className="mr-2 px-4 py-2">
                <Text className="text-base text-gray-600">Cancel</Text>
              </Pressable>

              <Pressable onPress={performConfirmAction} className="rounded bg-red-600 px-4 py-2">
                <Text className="text-white">
                  {confirmModal.type === 'delete' ? 'Delete' : 'Leave'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
