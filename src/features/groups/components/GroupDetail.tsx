// app/groups/[id]/index.tsx  (or wherever your GroupDetailScreen lives)
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import BottomSheet from '@/components/BottomSheet';
import SummaryCard from '@/components/SummaryCard';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import {
  selectedGroupAtom,
  selectedGroupIdAtom,
  selectedGroupMembersAtom,
} from '@/stores/atoms/groups';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';
import { formatRs } from '@/utils/formatRs';

function AvatarSmall({
  uri,
  name,
  size = 40,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = (() => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  })();

  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  if (uri) {
    return <Image source={{ uri }} style={style as any} />;
  }

  return (
    <View
      style={{
        ...style,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontWeight: '600', color: '#111827' }}>{initials}</Text>
    </View>
  );
}

export default function GroupDetailScreen() {
  const { theme } = useTheme();
  const getColor = useColor();
  const selectedGroupId = useAtomValue(selectedGroupIdAtom);
  const selectedGroup = useAtomValue(selectedGroupAtom);
  const groupMembers = useAtomValue(selectedGroupMembersAtom);

  const navigation = useNavigation();
  const router = useRouter();

  // Transactions: use canonical source if available on selectedGroup (adjust if different)
  const transactions = (selectedGroup?.transactions ?? []) as Array<any>;

  const [addOpen, setAddOpen] = useState(false);

  // picker bottom-sheet state + resolvers
  const [paidByPickerOpen, setPaidByPickerOpen] = useState(false);
  const [participantsPickerOpen, setParticipantsPickerOpen] = useState(false);
  const paidByResolverRef = useRef<(id?: string) => void>();
  const participantsResolverRef = useRef<(ids?: string[]) => void>();
  const [multiSelected, setMultiSelected] = useState<Record<string, boolean>>({});

  // Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={selectedGroup?.group_name ?? 'Group'}
          showBackButton
          rightActions={
            <View className="flex-row gap-4">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: `/groups/${selectedGroupId}/settle-up`,
                    params: { selectedGroupId },
                  })
                }
                accessibilityLabel="Settle up">
                <MaterialCommunityIcons name="hand-coin" size={28} color={getColor('textWhite')} />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: `/groups/${selectedGroupId}/settings`,
                    params: { selectedGroupId },
                  })
                }
                accessibilityLabel="Settings">
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
  }, [navigation, selectedGroup?.group_name, getColor, selectedGroupId, router]);

  // ---------------- Picker promise-based callbacks ----------------
  const openPaidByPicker = useCallback(async () => {
    // returns Promise<string | void> -> selected member id or undefined if cancelled
    return new Promise<string | void>((resolve) => {
      paidByResolverRef.current = resolve;
      setPaidByPickerOpen(true);
    });
  }, []);

  const openParticipantsPicker = useCallback(async () => {
    // returns Promise<string[] | void> -> array of selected member ids or undefined if cancelled
    return new Promise<string[] | void>((resolve) => {
      participantsResolverRef.current = resolve;
      setParticipantsPickerOpen(true);
    });
  }, []);

  const handleSelectPaidBy = (id: string) => {
    paidByResolverRef.current?.(id);
    paidByResolverRef.current = undefined;
    setPaidByPickerOpen(false);
  };

  const toggleMulti = (id: string) => {
    setMultiSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleConfirmParticipants = () => {
    const arr = Object.entries(multiSelected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    participantsResolverRef.current?.(arr);
    participantsResolverRef.current = undefined;
    setParticipantsPickerOpen(false);
    setMultiSelected({});
  };

  const handleCancelParticipants = () => {
    participantsResolverRef.current?.();
    participantsResolverRef.current = undefined;
    setParticipantsPickerOpen(false);
    setMultiSelected({});
  };

  // ---------------- UI ----------------
  return (
    <View className="mt-2 flex-1">
      {selectedGroup && groupMembers && groupMembers.length > 0 ? (
        <View className="mt-2 flex-1 ">
          {transactions.length ? (
            <>
              <View className="flex-row justify-evenly gap-3 px-4">
                {/* If you have real summary values in the group, replace these */}
                <SummaryCard
                  title="Total Spent"
                  value={formatRs(selectedGroup.total_spent ?? 0)}
                  type="total"
                />
                <SummaryCard
                  title="You Owe"
                  value={formatRs(selectedGroup.you_owe ?? 0)}
                  type="you"
                />
                <SummaryCard
                  title="Friends Owe"
                  value={formatRs(selectedGroup.friends_owe ?? 0)}
                  type="friend"
                />
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
                data={transactions}
                keyExtractor={(e) => e.id}
                renderItem={({ item }) => (
                  <TransactionCard
                    onPress={() =>
                      router.push(`/groups/${selectedGroupId}/transactions/${item.id}`)
                    }
                    title={item.title}
                    subtitle={`Paid by - ${item.paidBy ?? ''} @ ${item.createdAt ?? ''}`}
                    avatarInitials={item.avatarInitials ?? ''}
                    amount={item.amount}
                    status={item.status}
                    hasAttachment={item.hasAttachment}
                  />
                )}
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
              <Text className="text-base font-semibold">No Transactions</Text>
              <Pressable
                className="flex-row items-center justify-between py-4"
                onPress={() => setAddOpen(true)}>
                <View>
                  <Text className="text-base">Add New Transaction</Text>
                </View>
              </Pressable>
            </View>
          )}

          <AddBillSheet
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onSave={(payload) => {
              // Persist bill -> implement your persistence here (Supabase / API)
              console.log('SAVE BILL', payload);
              setAddOpen(false);
            }}
            onSelectPaidBy={openPaidByPicker}
            onSelectParticipants={openParticipantsPicker}
          />
        </View>
      ) : (
        <View className="flex h-full justify-center px-4">
          <Text className="text-base font-semibold">You have created a new group</Text>
          <Pressable
            className="flex-row items-center justify-between py-4"
            onPress={() =>
              router.push({
                pathname: `/groups/${selectedGroupId}/add-members`,
                params: { selectedGroupId },
              })
            }>
            <View>
              <Text className="text-base">Add Members</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* ---------------- Paid-by BottomSheet ---------------- */}
      <BottomSheet
        open={paidByPickerOpen}
        onClose={() => {
          paidByResolverRef.current?.();
          paidByResolverRef.current = undefined;
          setPaidByPickerOpen(false);
        }}>
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-3 text-center text-lg font-semibold">
          Select payer
        </Text>

        {/* member list (shows avatar, real name, subtle phone) */}
        <View className="p-2">
          {groupMembers?.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => handleSelectPaidBy(m.id)}
              className="flex-row items-center rounded-lg px-2 py-3"
              style={{ backgroundColor: theme.colors.gray50, marginBottom: 8 }}>
              <View className="pr-3">
                <AvatarSmall
                  uri={m.avatar_url ?? m.avatarUrl}
                  name={m.name ?? m.nickname}
                  size={40}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary }} className="text-base">
                  {m.name ?? m.nickname ?? m.email ?? m.id}
                </Text>
                {m.phone ? (
                  <Text style={{ color: theme.colors.textSecondary }} className="text-xs">
                    {m.phone}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* ---------------- Participants multi-select BottomSheet ---------------- */}
      <BottomSheet open={participantsPickerOpen} onClose={handleCancelParticipants}>
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-3 text-center text-lg font-semibold">
          Select participants
        </Text>

        <View className="p-2">
          {groupMembers?.map((m) => {
            const selected = !!multiSelected[m.id];
            return (
              <Pressable
                key={m.id}
                onPress={() => toggleMulti(m.id)}
                className="mb-2 rounded-lg px-2 py-3"
                style={{
                  backgroundColor: selected ? theme.colors.primary.DEFAULT : theme.colors.gray50,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <View className="pr-3">
                  <AvatarSmall
                    uri={m.avatar_url ?? m.avatarUrl}
                    name={m.name ?? m.nickname}
                    size={40}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: selected ? theme.colors.textWhite : theme.colors.textPrimary,
                      fontSize: 16,
                    }}>
                    {m.name ?? m.nickname ?? m.email ?? m.id}
                  </Text>
                  {m.phone ? (
                    <Text
                      style={{
                        color: selected ? theme.colors.textWhite : theme.colors.textSecondary,
                        fontSize: 12,
                      }}>
                      {m.phone}
                    </Text>
                  ) : null}
                </View>

                {/* simple selected indicator */}
                {selected ? (
                  <View style={{ paddingHorizontal: 8 }}>
                    <Text style={{ color: theme.colors.textWhite }}>✓</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row justify-between px-3 py-2">
          <TouchableOpacity onPress={handleCancelParticipants} className="rounded-lg px-4 py-3">
            <Text style={{ color: theme.colors.textPrimary }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirmParticipants}
            style={{ backgroundColor: theme.colors.primary.DEFAULT }}
            className="rounded-lg px-4 py-3">
            <Text style={{ color: theme.colors.textWhite }}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}
