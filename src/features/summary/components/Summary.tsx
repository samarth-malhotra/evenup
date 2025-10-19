import { useNavigation } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import AppHeader from '@/components/AppHeader';
import SummaryCard from '@/components/SummaryCard';
import TransactionCard from '@/components/TransactionCard';
import {
  useTransactionFeed,
  useTransactionHeader,
} from '@/features/summary/hooks/useTransactionSummary';
import { userAtom } from '@/stores/atoms/user';
import { formatRs } from '@/utils/formatRs';

/* ------------------------------ date helpers ------------------------------ */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function sixMonthsAgoStart() {
  const x = new Date();
  x.setMonth(x.getMonth() - 6);
  return startOfDay(x);
}

/* ------------------------------ y-axis helpers ---------------------------- */

function niceMax(n: number) {
  if (n <= 0) return 100; // safe floor
  const x = n * 1.2; // headroom
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  const norm = x / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * mag;
}
function formatTick(v: number) {
  if (v >= 1000) {
    const k = v / 1000;
    // keep one decimal under 10k to prevent duplicate labels from rounding
    const dec = k < 10 ? 1 : 0;
    return `${k.toFixed(dec)}k`;
  }
  return `${Math.round(v)}`;
}
function buildYAxis(values: number[], sections = 4) {
  const max = Math.max(0, ...values);
  const yMax = niceMax(max);
  const ticks = Array.from({ length: sections + 1 }, (_, i) => formatTick((i * yMax) / sections));
  return { yMax, ticks };
}

/* --------------------------------- screen --------------------------------- */

export default function TransactionSummary() {
  const navigation = useNavigation();
  const currentUser = useAtomValue(userAtom);
  const listRef = useRef<FlatList<any>>(null);

  // Default range so RPC always has a window
  const [startDate] = useState<Date | null>(sixMonthsAgoStart());
  const [endDate] = useState<Date | null>(endOfDay(new Date()));

  // (kept if you later add interactions)
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const startISO = startDate?.toISOString() ?? null;
  const endISO = endDate?.toISOString() ?? null;

  const headerQuery = useTransactionHeader(currentUser?.id, startISO, endISO);
  const feedQuery = useTransactionFeed({ userId: currentUser?.id, startISO, endISO, pageSize: 10 });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Summary" showBackButton />,
    });
  }, [navigation]);

  // Scroll to top when window changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [startISO, endISO]);

  const totals = headerQuery.data?.totals ?? { totalSpent: 0, youOwe: 0, friendsOwe: 0 };
  const chart = headerQuery.data?.chart ?? []; // [{ month: "YYYY-MM", total: number }]

  // 🔹 Bars built directly from server months -> zero chance of key mismatch
  const barData = useMemo(() => {
    if (!chart.length) return [];
    return chart.map((c, idx) => {
      const [y, m] = c.month.split('-').map(Number);
      const label = new Date(y, (m ?? 1) - 1, 1).toLocaleString(undefined, { month: 'short' });
      return {
        value: Number(c.total) || 0,
        label,
        barWidth: 28,
        frontColor: idx === selectedBar ? '#6C5CE7' : 'rgba(108,92,231,0.28)',
      };
    });
  }, [chart, selectedBar]);

  const { yMax, ticks } = useMemo(
    () =>
      buildYAxis(
        barData.map((b) => b.value),
        4
      ),
    [barData]
  );

  const transactions = feedQuery.data?.pages.flatMap((p) => p.transactions) ?? [];

  const Header = (
    <View>
      <View style={styles.cardsRow}>
        <SummaryCard title="Total Spent" value={formatRs(totals.totalSpent)} type="total" />
        <SummaryCard title="You Owe" value={formatRs(totals.youOwe)} type="you" />
        <SummaryCard title="Friends Owe" value={formatRs(totals.friendsOwe)} type="friend" />
      </View>

      <View style={styles.chartCard}>
        <BarChart
          data={barData}
          height={200}
          maxValue={yMax}
          noOfSections={4}
          spacing={26}
          initialSpacing={32}
          endSpacing={52}
          labelWidth={36}
          barBorderRadius={10}
          yAxisThickness={1}
          yAxisColor="#E5E7EB"
          yAxisLabelTexts={ticks} // ✅ computed ticks (no more 0k 0k 1k)
          xAxisThickness={0}
          onPress={(_: any, index: any) => {
            setSelectedBar((p) => (p === index ? null : index));
          }}
          focusedBarIndex={selectedBar ?? -1}
          isAnimated
        />
      </View>
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      data={transactions}
      keyExtractor={(it) => it.id}
      ListHeaderComponent={Header}
      renderItem={({ item }) => (
        <TransactionCard
          compact
          noShadow
          title={item.title}
          subtitle={`${item.groupName} ${new Date(item.date).toLocaleDateString()}`}
          avatarInitials={item.title.slice(0, 2)}
          amount={formatRs(item.amount)}
          status={item.amount < 0 ? 'you-owe' : 'friend-owe'}
        />
      )}
      onEndReached={() => {
        if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) feedQuery.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 14 },
});
