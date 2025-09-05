import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

import AddBillSheet from '@/lib/bills/components/AddBillSheet';
import AppHeader from '@/lib/shared/components/AppHeader';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import { COLORS } from '@/theme/color';

import { computeBalances, currency, selectExpenses, selectGroup, selectMemberById } from '../util';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const currentUserId = 'me';
  const group = selectGroup(id);
  const rawExpenses = selectExpenses(id);

  const expenses = useMemo(
    () => [...rawExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [rawExpenses]
  );

  const { youOwe, friendsOweYou, total } = useMemo(
    () => computeBalances(id, currentUserId),
    [id, currentUserId, rawExpenses]
  );
  const [addOpen, setAddOpen] = useState(false);
  // ---------------- Header ----------------
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={group?.name ?? 'Group'}
          showBackButton
          rightActions={
            <View className="flex-row gap-4">
              <Pressable onPress={handleSettleUp} accessibilityLabel="Settle up">
                <MaterialCommunityIcons name="hand-coin" size={28} color="#fff" />
              </Pressable>
              <Pressable onPress={handleSetting} accessibilityLabel="Settings">
                <MaterialCommunityIcons name="account-cog-outline" size={28} color="#fff" />
              </Pressable>
            </View>
          }
        />
      ),
    });
  }, [navigation, group?.name]);

  // ---------------- Handlers ----------------
  const handleSettleUp = () => {
    router.push({ pathname: `/groups/${id}/settle-up`, params: { groupId: id as string } });
  };

  const handleSetting = () => {
    router.push({ pathname: `/groups/${id}/settings`, params: { groupId: id as string } });
  };

  // ---------------- UI helpers ----------------
  const formatMoney = (n: number) => `${currency(group?.currency)}${n.toFixed(2)}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  const relationFor = (e: Expense) => {
    if (e.paidBy === currentUserId) return { label: 'You lent', tone: 'lent' as const };
    const myShare = e.splits[currentUserId] ?? 0;
    if (myShare > 0) return { label: 'You borrowed', tone: 'borrowed' as const };
    return { label: 'Not involved', tone: 'neutral' as const };
  };

  const PaidBy = ({ id }: { id: string }) => {
    const m: Member | undefined = selectMemberById(id);
    return (
      <Text className="text-xs text-gray-500">
        Paid by {m?.id === currentUserId ? 'You' : (m?.name ?? '—')}
      </Text>
    );
  };
  const openPaidByPicker = useCallback(async () => 'Anita', []);
  const openParticipantsPicker = useCallback(async () => ['You', 'Anita', 'Rohit'], []);

  // ---------------- Render ----------------
  return (
    <ThemedSafeArea className="flex-1">
      <View className="px-4">
        <View className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <View className="flex-row gap-3">
            <Stat label="Total" value={formatMoney(total)} />
            <Stat label="You owe" value={formatMoney(youOwe)} tone="danger" />
            <Stat label="Friends owe you" value={formatMoney(friendsOweYou)} tone="success" />
          </View>
        </View>
      </View>

      {/* Transactions Header */}
      <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
        <Text className="text-base font-semibold">Transactions</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="arrow-down" size={14} />
          <Text className="text-xs text-gray-600">Latest first</Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const rel = relationFor(item);
          return (
            <Pressable onPress={() => router.push(`/groups/${id}/transactions/${item.id}`)}>
              <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <View
                  className={clsx(
                    'h-10 w-10 items-center justify-center rounded-full',
                    rel.tone === 'lent' && 'bg-green-100',
                    rel.tone === 'borrowed' && 'bg-red-100',
                    rel.tone === 'neutral' && 'bg-gray-100'
                  )}>
                  <MaterialCommunityIcons
                    name={item.paidBy === currentUserId ? 'cash-fast' : 'cash-multiple'}
                    size={20}
                    color="#374151"
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-medium text-gray-900" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="font-semibold text-gray-800">{formatMoney(item.amount)}</Text>
                  </View>
                  <View className="mt-0.5 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-gray-500">{formatDate(item.date)}</Text>
                      <PaidBy id={item.paidBy} />
                    </View>
                    <Badge tone={rel.tone} label={rel.label} />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setAddOpen(true)}
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full shadow-md"
        style={{ backgroundColor: COLORS?.primary ?? '#6366F1' }}
        accessibilityLabel="Add expense">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddBillSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => {
          // Persist bill
          console.log('SAVE BILL', payload);
        }}
        onSelectPaidBy={openPaidByPicker}
        onSelectParticipants={openParticipantsPicker}
      />
    </ThemedSafeArea>
  );
}

// ---------------- UI Bits ----------------
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <View
      className={clsx(
        'flex-1 rounded-xl border p-3',
        tone === 'success' && 'border-green-100 bg-green-50',
        tone === 'danger' && 'border-red-100 bg-red-50',
        !tone && 'border-indigo-100 bg-indigo-50'
      )}>
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="mt-1 text-lg font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'lent' | 'borrowed' | 'neutral' }) {
  const toneCls =
    tone === 'lent'
      ? 'bg-green-100 text-green-700'
      : tone === 'borrowed'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-600';
  return (
    <View className={clsx('rounded-full px-2.5 py-0.5', toneCls)}>
      <Text className="text-[10px] font-medium">{label}</Text>
    </View>
  );
}
