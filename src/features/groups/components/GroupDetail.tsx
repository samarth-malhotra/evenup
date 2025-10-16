// app/groups/[id]/index.tsx  (or wherever GroupDetailScreen lives)
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import SummaryCard from '@/components/SummaryCard';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import { useCreateGroupTransaction } from '@/features/groups/hooks/useCreateGroupTransaction';
import { useGroupDetail } from '@/features/groups/hooks/useGroupDetail';
import { groupExpense } from '@/features/groups/mocks/groupList';
import { addToastAtom } from '@/stores/atoms/toast';
import { userAtom } from '@/stores/atoms/user';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';
import { formatRs } from '@/utils/formatRs';

// ---------------- Types ----------------
export type Member = {
  id: string;
  name: string;
  avatar?: string;
};

export type Expense = {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  category?: string;
  splits: Record<string, number>;
};

// ---------------- Screen ----------------
export default function GroupDetailScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const getColor = useColor();
  const navigation = useNavigation();
  const router = useRouter();

  const user = useAtomValue(userAtom);
  const addToast = useSetAtom(addToastAtom);

  const { data: selectedGroup, isFetching, isError, error } = useGroupDetail(user?.id, groupId);
  const createTx = useCreateGroupTransaction();

  const [addOpen, setAddOpen] = useState(false);

  // Picker modal state & promise resolver refs
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [showParticipantsPicker, setShowParticipantsPicker] = useState(false);
  const paidByResolveRef = useRef<((res?: string) => void) | null>(null);
  const participantsResolveRef = useRef<((res?: string[]) => void) | null>(null);
  const [participantsSelection, setParticipantsSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isError && error) {
      const msg = (error as any).message ?? 'Failed to load group';
      router.push('/(tabs)/groups');
      addToast({ title: 'Error', message: msg, type: 'error' });
    }
  }, [isError, error, addToast, router]);

  // ---------------- Handlers ----------------
  const handleSettleUp = () => {
    router.push({ pathname: `/groups/${groupId}/settle-up`, params: { groupId } });
  };

  const handleSetting = () => {
    router.push({ pathname: `/groups/${groupId}/settings`, params: { groupId } });
  };

  // ---------------- Header ----------------
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={selectedGroup?.name ?? 'Group'}
          showBackButton
          rightActions={
            <View className="flex-row gap-4">
              <Pressable onPress={handleSettleUp} accessibilityLabel="Settle up">
                <MaterialCommunityIcons name="hand-coin" size={28} color={getColor('textWhite')} />
              </Pressable>
              <Pressable onPress={handleSetting} accessibilityLabel="Settings">
                <MaterialCommunityIcons
                  name="account-cog-outline"
                  size={28}
                  color={getColor('textWhite')}
                />
              </Pressable>
            </View>
          }
        />
      ),
    });
  }, [navigation, selectedGroup?.name, handleSettleUp, getColor, handleSetting]);

  // ---------------- Pickers implemented as modals that resolve a Promise ---------------
  // openPaidByPicker returns a Promise<string | undefined> which resolves when user picks
  const openPaidByPicker = useCallback(async (): Promise<string | undefined> => {
    if (!selectedGroup?.members) return undefined;
    setShowPaidByPicker(true);
    return await new Promise((resolve) => {
      paidByResolveRef.current = resolve;
    });
  }, [selectedGroup?.members]);

  const openParticipantsPicker = useCallback(async (): Promise<string[] | undefined> => {
    if (!selectedGroup?.members) return undefined;
    // preselect current user by default
    const initial: Record<string, boolean> = {};
    selectedGroup.members.forEach((m) => {
      initial[m.id] = m.id === user?.id;
    });
    setParticipantsSelection(initial);
    setShowParticipantsPicker(true);
    return await new Promise((resolve) => {
      participantsResolveRef.current = resolve;
    });
  }, [selectedGroup?.members, user?.id]);

  // PaidBy modal helpers
  const handlePaidByChoose = (memberId: string) => {
    setShowPaidByPicker(false);
    paidByResolveRef.current?.(memberId);
    paidByResolveRef.current = null;
  };
  const handlePaidByCancel = () => {
    setShowPaidByPicker(false);
    paidByResolveRef.current?.(undefined);
    paidByResolveRef.current = null;
  };

  // Participants modal helpers (multi-select)
  const toggleParticipant = (id: string) =>
    setParticipantsSelection((s) => ({ ...s, [id]: !s[id] }));

  const handleParticipantsConfirm = () => {
    setShowParticipantsPicker(false);
    const chosen = Object.keys(participantsSelection).filter((k) => participantsSelection[k]);
    participantsResolveRef.current?.(chosen);
    participantsResolveRef.current = null;
  };

  const handleParticipantsCancel = () => {
    setShowParticipantsPicker(false);
    participantsResolveRef.current?.(undefined);
    participantsResolveRef.current = null;
  };

  // ---------------- Add bill: payload shaping, call RPC mutation ----------------
  const handleSaveBill = useCallback(
    async (payload: {
      title: string;
      amount: number;
      date: Date;
      paidBy: string; // id as returned by picker
      participants: string[]; // ids
      splitMethod: string;
      perPerson: Record<string, number>;
    }) => {
      console.log(' ################# ', JSON.stringify(payload));
      const splits = payload.participants.map((pId) => ({
        userId: pId,
        amount: Number((payload.perPerson[pId] ?? 0).toFixed(2)),
        shareType:
          payload.splitMethod === 'exact'
            ? 'exact'
            : payload.splitMethod === 'percent'
              ? 'percent'
              : 'exact',
        shareMeta:
          payload.splitMethod === 'percent' ? { percent: payload.perPerson[pId] ?? 0 } : {},
      }));

      // Build rpc payload: matches SQL function params
      const rpcPayload = {
        title: payload.title,
        amount: payload.amount,
        currency: 'INR',
        paidBy: payload.paidBy,
        groupId: groupId,
        createdBy: user?.id ?? null,
        receiptUrl: null,
        status: 'active',
        metadata: {},
        splits,
      };

      try {
        await createTx.mutateAsync(rpcPayload as any);
        // mutation's onSuccess will toast and invalidate queries
      } catch (err) {
        // error toast will be shown by mutation onError
        console.error('create tx err', err);
      }
    },
    [createTx, groupId, user?.id]
  );

  if (!selectedGroup && isFetching) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="p-4 text-gray-400">Loading group details...</Text>
      </View>
    );
  }

  if (!selectedGroup) {
    return <Text className="p-4 text-red-500">Group not found</Text>;
  }

  // ---------------- Render ----------------
  return (
    <View className="mt-2 flex-1">
      {selectedGroup && (selectedGroup?.members?.length ?? 0) > 0 ? (
        <View className="mt-2 flex-1 ">
          {/* Transactions / Summary - re-use your existing UI */}
          {groupExpense.length ? (
            <>
              <View className="flex-row justify-evenly gap-3 px-4">
                <SummaryCard title="Total Spent" value={formatRs(2000)} type="total" />
                <SummaryCard title="You Owe" value={formatRs(1500)} type="you" />
                <SummaryCard title="Friends Owe" value={formatRs(500)} type="friend" />
              </View>

              {/* Transactions Header */}
              <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
                <Text className="text-base font-semibold">Transactions</Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="arrow-down" size={14} />
                  <Text style={{ color: theme.colors.textSecondary }} className="text-xs">
                    Latest first
                  </Text>
                </View>
              </View>

              {/* Transactions List */}
              <FlatList
                className="px-4"
                showsVerticalScrollIndicator={false}
                data={groupExpense}
                keyExtractor={(e) => e.id}
                renderItem={({ item }) => {
                  return (
                    <TransactionCard
                      onPress={() => router.push(`/groups/${groupId}/transactions/${item.id}`)}
                      title={item.title}
                      subtitle={`Paid by - ${item.paidBy} @ ${item.createdAt}`}
                      avatarInitials={item.avatarInitials}
                      amount={item.amount}
                      hasAttachment={item.hasAttachment}
                    />
                  );
                }}
              />

              {/* Floating Action Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setAddOpen(true)}
                className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full"
                style={[{ backgroundColor: theme.colors.primary.DEFAULT }, getBoxShadow('md')]}
                accessibilityLabel="Add expense">
                <Ionicons name="add" size={28} color={getColor('textWhite')} />
              </TouchableOpacity>
            </>
          ) : (
            <View className="px-4 text-center">
              <Text className="text-base font-semibold">No Transcations</Text>
              <Pressable
                className="flex-row items-center justify-between py-4"
                onPress={() => setAddOpen(true)}>
                <View>
                  <Text className="text-base">Add New Trasncation</Text>
                </View>
              </Pressable>
            </View>
          )}

          <AddBillSheet
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onSave={handleSaveBill}
            onSelectPaidBy={openPaidByPicker}
            onSelectParticipants={openParticipantsPicker}
            members={selectedGroup.members}
          />
        </View>
      ) : (
        <View className="flex h-full justify-center px-4 align-middle">
          <Text className="text-base font-semibold">You have created new groug</Text>
          <Pressable
            className="flex-row items-center justify-between py-4"
            onPress={() =>
              router.push({
                pathname: `/groups/${groupId}/add-members`,
                params: { groupId },
              })
            }>
            <View>
              <Text className="text-base">Add Members</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* ---------------- PaidBy modal ---------------- */}
      <Modal visible={showPaidByPicker} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="max-h-96 w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Select payer</Text>

            <FlatList
              data={selectedGroup?.members ?? []}
              keyExtractor={(m: any) => m.id}
              renderItem={({ item }: any) => (
                <Pressable
                  onPress={() => handlePaidByChoose(item.id)}
                  className="border-b border-gray-100 py-3">
                  <Text className="text-base">
                    {item.id === user?.id ? 'You' : (item.name ?? 'Unknown')}
                  </Text>
                  {item.email ? <Text className="text-xs text-gray-500">{item.email}</Text> : null}
                </Pressable>
              )}
            />

            <View className="mt-3 flex-row justify-end">
              <Pressable onPress={handlePaidByCancel} className="mr-2 px-4 py-2">
                <Text className="text-base text-gray-600">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- Participants modal ---------------- */}
      <Modal visible={showParticipantsPicker} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="max-h-96 w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Select members</Text>

            <FlatList
              data={selectedGroup?.members ?? []}
              keyExtractor={(m: any) => m.id}
              renderItem={({ item }: any) => {
                const checked = !!participantsSelection[item.id];
                return (
                  <Pressable
                    onPress={() => toggleParticipant(item.id)}
                    className="flex-row items-center justify-between border-b border-gray-100 py-3">
                    <View>
                      <Text className="text-base">
                        {item.id === user?.id ? 'You' : (item.name ?? 'Unknown')}
                      </Text>
                      {item.email ? (
                        <Text className="text-xs text-gray-500">{item.email}</Text>
                      ) : null}
                    </View>
                    <View className="mr-2">
                      <Text>{checked ? '✓' : ''}</Text>
                    </View>
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
