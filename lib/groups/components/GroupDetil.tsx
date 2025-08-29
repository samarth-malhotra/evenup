// app/(tabs)/groups/[id].tsx
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import WaveHeader from '@/lib/shared/components/WaveHeader';
import { COLORS } from '@/theme/color';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect, useMemo } from 'react';
import { FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

// ---------------- Types (keep in sync with your data layer) ----------------
export type Member = {
  id: string;
  name: string;
  avatar?: string;
};

export type Expense = {
  id: string;
  groupId: string;
  title: string;
  amount: number; // positive amount in group's currency
  paidBy: string; // member id
  date: string; // ISO date string
  category?: string; // e.g. food, travel
  splits: Record<string, number>; // memberId -> share amount
};

// ---------------- Screen ----------------
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  // You likely have a currentUser in state/context; hardcode or wire up here
  const currentUserId = 'me'; // TODO: replace with selector from auth/user store

  const group = selectGroup(id);
  const rawExpenses = selectExpenses(id);

  const expenses = useMemo(() => {
    // Ascending by date (oldest first)
    return [...rawExpenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rawExpenses]);

  const { youOwe, friendsOweYou, total } = useMemo(
    () => computeBalances(id, currentUserId),
    [id, currentUserId, rawExpenses]
  );

  // ---------------- Header ----------------
  useLayoutEffect(() => {
    // If you set `header`, React Navigation replaces the entire header — so the default back button,
    // title, and right actions disappear. To *keep* the default back + title while getting your
    // wavy look, use `headerBackground` instead of `header`.
    navigation.setOptions({
      headerShown: true,
      headerTitle: group?.name ?? 'Group',
      headerBackTitleVisible: false,
      headerRight: () => (
        <Pressable
          onPress={() => router.push({ pathname: '/groups/[id]/settings', params: { id } })}
          className="mr-3"
          accessibilityLabel="Group settings">
          <Ionicons name="settings-sharp" size={22} />
        </Pressable>
      ),

      // Keep default header layout (back button, spacing, gestures), but paint your waves behind it
      headerBackground: () => <WaveHeader height={200} />,
      // If your WaveHeader sits under a translucent bar, uncomment:
      // headerTransparent: true,
    });
  }, [navigation, group?.name, id]);

  // ---------------- Handlers ----------------
  const handleSettleUp = () => {
    router.push({ pathname: '/settle', params: { groupId: id as string } });
  };

  const handleAddExpense = () => {
    router.push({ pathname: '/bills/addBill', params: { groupId: id as string } });
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

  // ---------------- Render ----------------
  return (
    <ThemedSafeArea className="flex-1 bg-white dark:bg-black">
      {/* Summary */}
      <View className="px-4 pt-3">
        <View className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold">{group?.name}</Text>
            <Pressable
              onPress={handleSettleUp}
              className="flex-row items-center gap-2 rounded-full bg-green-600 px-3 py-1.5"
              accessibilityLabel="Settle up">
              <MaterialCommunityIcons name="hand-coin" size={16} color="#fff" />
              <Text className="font-medium text-white">Settle up</Text>
            </Pressable>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Stat label="Total" value={formatMoney(total)} />
            <Stat label="You owe" value={formatMoney(youOwe)} tone="danger" />
            <Stat label="Friends owe you" value={formatMoney(friendsOweYou)} tone="success" />
          </View>
        </View>
      </View>

      {/* Transactions Header */}
      <View className="mb-2 mt-5 flex-row items-center justify-between px-4">
        <Text className="text-base font-semibold">All transactions</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="arrow-up" size={14} />
          <Text className="text-xs text-gray-600">Ascending by date</Text>
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
            <View className="shadow-xs mb-3 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-neutral-900">
              <View
                className={clsx(
                  'h-10 w-10 items-center justify-center rounded-full',
                  rel.tone === 'lent' && 'bg-green-100 dark:bg-green-900/30',
                  rel.tone === 'borrowed' && 'bg-red-100 dark:bg-red-900/30',
                  rel.tone === 'neutral' && 'bg-gray-100 dark:bg-neutral-800'
                )}>
                <MaterialCommunityIcons
                  name={item.paidBy === currentUserId ? 'cash-fast' : 'cash-multiple'}
                  size={20}
                />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="font-semibold">{formatMoney(item.amount)}</Text>
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
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleAddExpense}
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: COLORS?.primary ?? '#6366F1' }}
        accessibilityLabel="Add expense">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
        tone === 'success' &&
          'border-green-100 bg-green-50 dark:border-green-900 dark:bg-green-900/20',
        tone === 'danger' && 'border-red-100 bg-red-50 dark:border-red-900 dark:bg-red-900/20',
        !tone && 'border-indigo-100 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-900/20'
      )}>
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="mt-1 text-lg font-semibold">{value}</Text>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'lent' | 'borrowed' | 'neutral' }) {
  const toneCls =
    tone === 'lent'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : tone === 'borrowed'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300';
  return (
    <View className={clsx('rounded-full px-2.5 py-0.5', toneCls)}>
      <Text className="text-[10px] font-medium">{label}</Text>
    </View>
  );
}

// Remove these and use your real implementations
export const selectGroup = (id?: string) =>
  id ? { id, name: 'Goa Trip', currency: 'INR' } : undefined;
export const selectExpenses = (groupId?: string): Expense[] =>
  !groupId
    ? []
    : [
        {
          id: 'e1',
          groupId,
          title: 'Taxi from airport',
          amount: 1200,
          paidBy: 'u2',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          category: 'travel',
          splits: { me: 400, u2: 400, u3: 400 },
        },
        {
          id: 'e2',
          groupId,
          title: 'Lunch Day 1',
          amount: 1800,
          paidBy: 'me',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
          category: 'food',
          splits: { me: 600, u2: 600, u3: 600 },
        },
        {
          id: 'e3',
          groupId,
          title: 'Beach shack snacks',
          amount: 900,
          paidBy: 'u3',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
          category: 'food',
          splits: { me: 300, u2: 300, u3: 300 },
        },
      ];

export const selectMemberById = (memberId: string): Member | undefined => {
  const book: Record<string, Member> = {
    me: { id: 'me', name: 'You' },
    u2: { id: 'u2', name: 'Anita' },
    u3: { id: 'u3', name: 'Rohit' },
  };
  return book[memberId];
};

export const computeBalances = (groupId: string, currentUserId: string) => {
  const list = selectExpenses(groupId);
  const total = list.reduce((s, e) => s + e.amount, 0);
  let youOwe = 0;
  let friendsOweYou = 0;
  for (const e of list) {
    const myShare = e.splits[currentUserId] ?? 0;
    if (e.paidBy === currentUserId) {
      friendsOweYou += e.amount - myShare;
    } else {
      youOwe += myShare;
    }
  }
  return { total, youOwe, friendsOweYou };
};

export const currency = (code?: string) => {
  switch (code) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    default:
      return '₹';
  }
};
