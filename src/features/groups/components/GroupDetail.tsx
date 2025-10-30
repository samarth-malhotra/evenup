// app/groups/[id]/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import SummaryCard from '@/components/SummaryCard';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import { useGroupTransactionsPaginated } from '@/features/groups/hooks/transactions';
import { useGroupDetail } from '@/features/groups/hooks/useGroupDetail';
import { addToastAtom } from '@/stores/atoms/toast';
import { userAtom } from '@/stores/atoms/user';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';
import { formatRs } from '@/utils/formatRs';

export default function GroupDetailScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { theme } = useTheme();
  const getColor = useColor();

  const user = useAtomValue(userAtom);
  const addToast = useSetAtom(addToastAtom);

  const {
    data: selectedGroup,
    isFetching: groupFetching,
    isError: groupIsError,
    error: groupError,
  } = useGroupDetail(user?.id, groupId);

  // transactions infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: txFetching,
    refetch,
    isError: txIsError,
    error: txError,
  } = useGroupTransactionsPaginated(groupId, user?.id, 10);

  const transactions = data ? data.pages.flatMap((p) => p.transactions) : [];
  const summary = data?.pages?.[0]?.summary ?? { totalSpent: 0, youOwe: 0, friendsOwe: 0 };

  // UI
  const [addOpen, setAddOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // pickers - reuse existing pattern by exposing functions that return a Promise via refs
  const paidByResolveRef = useRef<((v?: string) => void) | null>(null);
  const participantsResolveRef = useRef<((v?: string[]) => void) | null>(null);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [showParticipantsPicker, setShowParticipantsPicker] = useState(false);
  const [participantsSelection, setParticipantsSelection] = useState<Record<string, boolean>>({});

  // header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={selectedGroup?.name ?? 'Group'}
          showBackButton
          rightActions={
            <View className="flex-row gap-4">
              <Pressable onPress={() => router.push(`/groups/${groupId}/settle-up`)}>
                <MaterialCommunityIcons name="hand-coin" size={26} color={getColor('textWhite')} />
              </Pressable>
              <Pressable onPress={() => router.push(`/groups/${groupId}/settings`)}>
                <MaterialCommunityIcons
                  name="account-cog-outline"
                  size={26}
                  color={getColor('textWhite')}
                />
              </Pressable>
            </View>
          }
        />
      ),
    });
  }, [selectedGroup?.name, getColor, navigation, router, groupId]);

  // pickers impl
  const openPaidByPicker = async () => {
    setShowPaidByPicker(true);
    return new Promise<string | undefined>((resolve) => (paidByResolveRef.current = resolve));
  };
  const openParticipantsPicker = async () => {
    if (!selectedGroup?.members) return [];
    const initial: Record<string, boolean> = {};
    selectedGroup.members.forEach((m: any) => (initial[m.id] = m.id === user?.id));
    setParticipantsSelection(initial);
    setShowParticipantsPicker(true);
    return new Promise<string[] | undefined>(
      (resolve) => (participantsResolveRef.current = resolve)
    );
  };
  const handlePaidByChoose = (id: string) => {
    setShowPaidByPicker(false);
    paidByResolveRef.current?.(id);
    paidByResolveRef.current = null;
  };
  const handlePaidByCancel = () => {
    setShowPaidByPicker(false);
    paidByResolveRef.current?.(undefined);
    paidByResolveRef.current = null;
  };
  const toggleParticipant = (id: string) =>
    setParticipantsSelection((s) => ({ ...s, [id]: !s[id] }));
  const handleParticipantsConfirm = () => {
    setShowParticipantsPicker(false);
    const selected = Object.keys(participantsSelection).filter((k) => participantsSelection[k]);
    participantsResolveRef.current?.(selected);
    participantsResolveRef.current = null;
  };
  const handleParticipantsCancel = () => {
    setShowParticipantsPicker(false);
    participantsResolveRef.current?.(undefined);
    participantsResolveRef.current = null;
  };

  // save bill callback — passed to AddBillSheet; refetch after creation
  const handleSaved = () => {
    refetch();
    addToast({ title: 'Saved', message: 'Transaction saved', type: 'success' });
  };

  // pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (groupIsError) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-500">
          Failed to load group: {(groupError as any)?.message ?? 'Unknown'}
        </Text>
      </View>
    );
  }

  if ((groupFetching && !selectedGroup) || (txFetching && !data)) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-gray-400">Loading group and transactions...</Text>
      </View>
    );
  }

  if (!selectedGroup) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-500">Group not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="mt-2 flex-row justify-evenly px-4">
        <SummaryCard title="Total Spent" value={formatRs(summary.totalSpent)} type="total" />
        <SummaryCard title="You Owe" value={formatRs(summary.youOwe)} type="you" />
        <SummaryCard title="Friends Owe" value={formatRs(summary.friendsOwe)} type="friend" />
      </View>

      <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
        <Text className="text-base font-semibold">Transactions</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-gray-500">Latest first</Text>
          <Pressable onPress={() => refetch()}>
            <Text className="text-xs text-indigo-600">Refresh</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(i: any) => i.id}
        renderItem={({ item }) => (
          <TransactionCard
            title={item.title}
            subtitle={`Paid by ${item.paidByName ?? item.paidBy} • ${item.createdAt?.slice(0, 10) ?? ''}`}
            amount={item.amount}
            avatarInitials={(item.paidByName ?? '?').slice(0, 2).toUpperCase()}
            onPress={() => router.push(`/groups/${groupId}/transactions/${item.id}`)}
          />
        )}
        ListEmptyComponent={() =>
          txFetching ? null : (
            <View className="items-center p-8">
              <Text className="text-gray-500">No transactions yet. Add one using the + button</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 140 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="p-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setAddOpen(true)}
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full"
        style={[{ backgroundColor: theme.colors.primary.DEFAULT }, getBoxShadow('md')]}>
        <Ionicons name="add" size={28} color={getColor('textWhite')} />
      </TouchableOpacity>

      <AddBillSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleSaved}
        onSelectPaidBy={openPaidByPicker}
        onSelectParticipants={openParticipantsPicker}
        members={selectedGroup.members}
        mode="create"
        groupId={groupId}
        groupName={selectedGroup.name}
      />

      {/* PaidBy modal */}
      <Modal
        visible={showPaidByPicker}
        transparent
        animationType="fade"
        onRequestClose={handlePaidByCancel}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Select payer</Text>
            <FlatList
              data={selectedGroup.members}
              keyExtractor={(m: any) => m.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handlePaidByChoose(item.id)}
                  className="border-b border-gray-100 py-3">
                  <Text className="text-base">{item.id === user?.id ? 'You' : item.name}</Text>
                  {item.email && <Text className="text-xs text-gray-500">{item.email}</Text>}
                </Pressable>
              )}
            />
            <Pressable onPress={handlePaidByCancel} className="mt-2 self-end px-4 py-2">
              <Text className="text-base text-gray-600">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Participants modal */}
      <Modal
        visible={showParticipantsPicker}
        transparent
        animationType="fade"
        onRequestClose={handleParticipantsCancel}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Select participants</Text>
            <FlatList
              data={selectedGroup.members}
              keyExtractor={(m: any) => m.id}
              renderItem={({ item }) => {
                const checked = !!participantsSelection[item.id];
                return (
                  <Pressable
                    onPress={() => toggleParticipant(item.id)}
                    className="flex-row items-center justify-between border-b border-gray-100 py-3">
                    <View>
                      <Text className="text-base">{item.id === user?.id ? 'You' : item.name}</Text>
                      {item.email && <Text className="text-xs text-gray-500">{item.email}</Text>}
                    </View>
                    <Text>{checked ? '✓' : ''}</Text>
                  </Pressable>
                );
              }}
            />
            <View className="mt-3 flex-row justify-end">
              <Pressable onPress={handleParticipantsCancel} className="mr-2 px-4 py-2">
                <Text className="text-base text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleParticipantsConfirm}
                className="rounded bg-indigo-600 px-4 py-2">
                <Text className="text-white">Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
