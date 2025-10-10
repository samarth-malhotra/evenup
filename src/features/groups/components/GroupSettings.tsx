// app/groups/[id]/settings.tsx
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import UpdateMemberSheet from '@/features/groups/components/BottomSheet/UpdateMemberSheet';
import { selectedGroupIdAtom, selectedGroupMembersAtom } from '@/stores/atoms/groups';
import { useTheme } from '@/theme/hooks/useTheme';

type User = { id: string; name: string; avatar?: string };

export default function GroupSettings() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const groupMember = useAtomValue(selectedGroupMembersAtom);
  const selectedGroupId = useAtomValue(selectedGroupIdAtom);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Group Settings" showBackButton />,
    });
  }, [navigation]);

  // --- group state (replace with EvenUp selectors) ---
  const [groupName, setGroupName] = useState('Trip to Goa');

  // UI state
  const [isMembersSheetOpen, setMembersSheetOpen] = useState(false);
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
  console.log('group setting: ', groupMember);
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
      <Pressable
        className="flex-row items-center justify-between py-4"
        onPress={() =>
          router.push({
            pathname: `/groups/${selectedGroupId}/add-members`,
            params: { selectedGroupId },
          })
        }>
        <View>
          <Text className="text-base">Add / Remove people</Text>
          <Text className="text-xs text-gray-500">Manage group members</Text>
        </View>
        <Feather name="chevron-right" size={24} color="#6b7280" />
      </Pressable>

      {/* Members preview */}
      {groupMember.length && (
        <View className="border-b border-gray-200 py-4">
          <Text className="mb-2 text-sm text-gray-500">People in group</Text>
          <View className="flex-row flex-wrap items-center">
            {groupMember.map((m) => (
              <View key={m.id} className="mb-3 mr-3 items-center">
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                  {/* {m.name ? (
                  <Image source={{ uri: m.avatar }} className="h-10 w-10" />
                ) : (
                )} */}
                  {/* <Text className="text-sm font-medium text-gray-700">{m.name[0]}</Text> */}
                  <Avatar name={m.name} />
                </View>
                <Text className="mt-1 text-xs">{m.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
      <UpdateMemberSheet open={isMembersSheetOpen} onClose={() => setMembersSheetOpen(false)} />

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
