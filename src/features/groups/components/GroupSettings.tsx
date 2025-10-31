// app/groups/[id]/settings.tsx
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Share,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { USER_STATUS } from '@/constant';
import UpdateMemberSheet from '@/features/groups/components/BottomSheet/UpdateMemberSheet';
import { useDeleteGroup } from '@/features/groups/hooks/useDeleteGroupMutation';
import useDeleteMemberMutation from '@/features/groups/hooks/useDeleteMemberFromGroupMutations';
import { useGroupDetail } from '@/features/groups/hooks/useGroupDetail';
import { useToggleGroupSimplified } from '@/features/groups/hooks/useToggleGroupSimplified';
import type { GroupMember } from '@/features/groups/types';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';
import { formatPhoneInternational, normalizeEmail } from '@/utils/normalise';

// type User = { id: string; name: string; avatar?: string };

function renderMember({ item }: { item: GroupMember }) {
  const name = item.name ?? item.email ?? item.phone ?? 'Unknown';

  return (
    <View className="flex-row items-center border-b border-gray-200 px-2 py-3">
      <Avatar name={item.name} />

      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="text-base font-medium">{name}</Text>
          {item.role === 'owner' && (
            <View className="ml-2 rounded-full bg-blue-100 px-2 py-0.5">
              <Text className="text-xs text-blue-700">Owner</Text>
            </View>
          )}
          {item.account_status === USER_STATUS.INVITED && (
            <View className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5">
              <Text className="text-xs text-yellow-800">Pending</Text>
            </View>
          )}
        </View>
        {item.phone && (
          <Text className="text-sm text-gray-500">{formatPhoneInternational(item.phone)}</Text>
        )}
        {item.email && <Text className="text-sm text-gray-500">{normalizeEmail(item.email)}</Text>}
      </View>

      <View className="ml-2 flex-row items-center">
        {item.account_status === USER_STATUS.INVITED && (
          <TouchableOpacity
            className="rounded-md border px-3 py-1"
            onPress={() => {
              // if (onInvite) onInvite(item.email ?? item.phone);
            }}>
            <Text className="text-sm">Resend</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function GroupSettings() {
  const { theme } = useTheme();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAtomValue(userAtom);
  const { data: group, isFetching } = useGroupDetail(user?.id, groupId);

  const groupMember: GroupMember[] = group?.members ?? [];
  const deleteMutation = useDeleteGroup(user?.id ?? '');

  const inviteLink = useMemo(() => `https://evenup.app/invite?group=${group?.id}`, [group?.id]);

  async function handleShareInvite() {
    try {
      await Share.share({
        message: `Join my EvenUp group: ${inviteLink}`,
        url: inviteLink,
      });
    } catch (err) {
      Alert.alert('Share failed', (err as Error).message ?? 'Could not share invite link');
    }
  }

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Group Settings" showBackButton />,
    });
  }, [navigation]);

  // --- group state (replace with EvenUp selectors) ---
  const [groupName, setGroupName] = useState(group?.name ?? '');

  // UI state
  const [isMembersSheetOpen, setMembersSheetOpen] = useState(false);
  const [simplifiedDebts, setSimplifiedDebts] = useState<boolean>(group?.simplified ?? false);

  // Edit name modal state
  const [isEditNameModalOpen, setEditNameModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(groupName);
  const { deleteMember, isDeleting } = useDeleteMemberMutation();

  // Confirm action modal (leave / delete)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type?: 'leave' | 'delete';
  }>({ visible: false });

  // hooks: toggle simplified mutation
  const toggleMutation = useToggleGroupSimplified();

  // sync server value -> local state when group loads/changes
  useEffect(() => {
    if (typeof group?.simplified === 'boolean') {
      setSimplifiedDebts(Boolean(group.simplified));
    }
    // keep groupName in sync
    if (group?.name) setGroupName(group.name);
  }, [group?.simplified, group?.name]);

  // helpers

  const openConfirmModal = (type: 'leave' | 'delete') => {
    setConfirmModal({ visible: true, type });
  };

  const performConfirmAction = () => {
    const type = confirmModal.type;
    setConfirmModal({ visible: false });
    if (type === 'leave') {
      // TODO: call leave API
      if (groupId && user?.id) {
        console.log('leaving group :', groupId, user?.id);
        deleteMember({
          groupId: groupId,
          memberId: user.id,
          removedBy: user.id,
          groupName: groupName,
        });
        // router.push('(tabs)/groups');
      }
      router.back();
    } else if (type === 'delete') {
      // TODO: call delete API
      // router.back();
      if (groupId && user?.id) {
        deleteMutation.mutate({
          groupId: groupId,
          group_name: groupName,
        });
      }
    }
    router.push('(tabs)/groups');
  };

  // Confirm rename from modal
  const confirmRename = () => {
    const name = editedName.trim();
    if (!name) return;
    setGroupName(name);
    setEditNameModalOpen(false);
    // TODO: persist rename
  };

  // toggle handler: update UI locally then call mutation
  const onToggleSimplified = (value: boolean) => {
    // optimistic local update (mutation hook also does optimistic update)
    setSimplifiedDebts(value);

    if (!groupId) {
      Alert.alert('Error', 'Missing group id');
      return;
    }

    toggleMutation.mutate(
      { groupId: groupId, simplified: value },
      {
        onError: (err) => {
          // rollback local state (the hook's onError/invalidate may also restore)
          setSimplifiedDebts(Boolean(group?.simplified ?? false));
          Alert.alert('Failed', err.message ?? 'Could not update simplified setting');
        },
      }
    );
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
      <Pressable
        className="flex-row items-center justify-between py-4"
        onPress={() =>
          router.push({
            pathname: `/groups/${groupId}/add-members`,
            params: { groupId },
          })
        }>
        <View>
          <Text className="text-base">Add / Remove people</Text>
          <Text className="text-xs text-gray-500">Manage group members</Text>
        </View>
        <Feather name="chevron-right" size={24} color="#6b7280" />
      </Pressable>

      {/* Members list */}
      <FlatList
        data={group?.members ?? []}
        keyExtractor={(m) => m.id}
        renderItem={renderMember}
        style={{ maxHeight: 340 }}
        ListHeaderComponent={<Text className="mb-2 text-sm text-gray-500">Group Member(s)</Text>}
      />

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
          onValueChange={onToggleSimplified}
          thumbColor={simplifiedDebts ? '#fff' : undefined}
          trackColor={{ false: '#E5E7EB', true: '#6C5CE7' }}
        />
      </View>

      {/* Invite link */}
      <View className="mt-4 rounded-md border bg-gray-50 p-3">
        <Text className="mb-2 text-sm text-gray-500">Invite link</Text>
        <View className="flex-row items-center">
          <Text numberOfLines={1} className="flex-1 text-sm">
            {inviteLink}
          </Text>
          <TouchableOpacity
            onPress={handleShareInvite}
            className="ml-2 rounded-md bg-gray-100 px-3 py-2">
            <Text>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Leave button only visible when 1+ people is group member */}
      {(groupMember?.length ?? 0) > 1 && (
        <Pressable
          className="border-b border-gray-200 py-4"
          onPress={() => openConfirmModal('leave')}>
          <Text className="text-base">Leave group</Text>
        </Pressable>
      )}
      {/* {!groupMember.find((m) => m.role === 'owner') && ( */}
      <Pressable className="py-4" onPress={() => openConfirmModal('delete')}>
        <Text className="text-base text-red-600">Delete group</Text>
      </Pressable>
      {/* )} */}
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
