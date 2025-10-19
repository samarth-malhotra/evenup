// app/summary/TransactionSummary.tsx
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

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
function sixMonthsDefault(): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  const s = new Date(end);
  s.setMonth(s.getMonth() - 5); // include current month => total 6 months
  s.setDate(1);
  return { start: startOfDay(s), end };
}
function monthStart(y: number, m /*1-12*/ : number) {
  return startOfDay(new Date(y, m - 1, 1));
}
function monthEnd(y: number, m /*1-12*/ : number) {
  return endOfDay(new Date(y, m, 0));
}
function keyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dateFromKey(key: string) {
  const [y, mm] = key.split('-').map(Number);
  return new Date(y, (mm ?? 1) - 1, 1);
}
function buildMonthKeys(start: Date, end: Date) {
  const out: string[] = [];
  const cur = new Date(start);
  cur.setDate(1);
  let guard = 0;
  while (cur <= end && guard++ < 24) {
    out.push(keyFromDate(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

const fmtShort = (d?: Date | null) =>
  d
    ? d.toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

/* ------------------------------ y-axis helpers ---------------------------- */

function niceMax(n: number) {
  if (n <= 0) return 100;
  const x = n * 1.2;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  const norm = x / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * mag;
}
function formatTick(v: number) {
  if (v >= 1000) {
    const k = v / 1000;
    return `${(k < 10 ? k.toFixed(1) : Math.round(k)).toString()}k`;
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

const BAR_WIDTH = 24;

export default function TransactionSummary() {
  const navigation = useNavigation();
  const currentUser = useAtomValue(userAtom);
  const listRef = useRef<FlatList<any>>(null);
  const throttleRef = useRef<number>(0);

  const def = useMemo(() => sixMonthsDefault(), []);
  const [startDate, setStartDate] = useState<Date | null>(def.start);
  const [endDate, setEndDate] = useState<Date | null>(def.end);
  const [picker, setPicker] = useState<{ mode: 'start' | 'end' | null }>({ mode: null });

  // When a bar is tapped we only highlight & filter list (chart window stays)
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [monthFilterKey, setMonthFilterKey] = useState<string | null>(null);

  const resetDateWindow = useCallback(() => {
    const d = sixMonthsDefault();
    setStartDate(d.start);
    setEndDate(d.end);
  }, []);
  const resetMonthFilter = useCallback(() => {
    setSelectedBarIndex(null);
    setMonthFilterKey(null);
  }, []);

  // feed dates = month range if filtered, else full window
  const feedStart = useMemo(() => {
    if (monthFilterKey) {
      const dt = dateFromKey(monthFilterKey);
      return monthStart(dt.getFullYear(), dt.getMonth() + 1);
    }
    return startDate;
  }, [monthFilterKey, startDate]);
  const feedEnd = useMemo(() => {
    if (monthFilterKey) {
      const dt = dateFromKey(monthFilterKey);
      return monthEnd(dt.getFullYear(), dt.getMonth() + 1);
    }
    return endDate;
  }, [monthFilterKey, endDate]);

  const startISO = startDate?.toISOString() ?? null;
  const endISO = endDate?.toISOString() ?? null;

  const headerQuery = useTransactionHeader(currentUser?.id, startISO, endISO);
  const feedQuery = useTransactionFeed({
    userId: currentUser?.id,
    startISO: feedStart?.toISOString() ?? null,
    endISO: feedEnd?.toISOString() ?? null,
    pageSize: 12,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Summary" showBackButton />,
    });
  }, [navigation]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [startISO, endISO, monthFilterKey]);

  const totals = headerQuery.data?.totals ?? { totalSpent: 0, youOwe: 0, friendsOwe: 0 };
  const chart = headerQuery.data?.chart ?? [];
  const monthTotalsMap = useMemo(() => {
    const m = new Map<string, number>();
    chart.forEach((c) => m.set(c.month, Number(c.total) || 0));
    return m;
  }, [chart]);

  const monthKeys = useMemo(() => {
    if (!startDate || !endDate) return [];
    return buildMonthKeys(startDate, endDate);
  }, [startDate, endDate]);

  const barData = useMemo(() => {
    return monthKeys.map((key, idx) => {
      const label = dateFromKey(key).toLocaleString(undefined, { month: 'short' });
      const value = monthTotalsMap.get(key) ?? 0;
      const hasData = value > 0;
      const focused = idx === (selectedBarIndex ?? -1);
      return {
        value: hasData ? value : 0,
        label,
        barWidth: BAR_WIDTH,
        frontColor: hasData ? (focused ? '#6C5CE7' : 'rgba(108,92,231,0.28)') : 'transparent',
        _key: key,
        _idx: idx,
      } as any;
    });
  }, [monthKeys, monthTotalsMap, selectedBarIndex]);

  const { yMax, ticks } = useMemo(
    () =>
      buildYAxis(
        barData.map((b) => b.value),
        4
      ),
    [barData]
  );

  const transactions = feedQuery.data?.pages.flatMap((p) => p.transactions) ?? [];
  const refreshing = headerQuery.isRefetching || feedQuery.isRefetching;

  // throttled infinite scroll
  const onEndReached = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current < 700) return;
    throttleRef.current = now;
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) feedQuery.fetchNextPage();
  }, [feedQuery]);

  const onRefresh = useCallback(async () => {
    await Promise.all([headerQuery.refetch(), feedQuery.refetch()]);
  }, [headerQuery, feedQuery]);

  // tap bar: highlight + filter list (chart still shows full window)
  const onPressBar = useCallback(
    (_: any, index: number) => {
      const item = barData[index] as any;
      if (!item) return;
      setSelectedBarIndex((prev) => (prev === index ? null : index));
      setMonthFilterKey((prev) => (prev === item._key ? null : item._key));
    },
    [barData]
  );

  // Same flag logic as before to hide the "Download" label when any reset is visible
  const isDateWindowDefault =
    startDate?.getTime() === def.start.getTime() && endDate?.getTime() === def.end.getTime();
  const showReset = !isDateWindowDefault || monthFilterKey !== null;

  // ✅ WORKING CSV DOWNLOAD (auto-fetches remaining pages before exporting)
  const downloadingRef = useRef(false);
  const downloadReport = useCallback(async () => {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    try {
      // Ensure all pages are loaded

      while (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
        const res = await feedQuery.fetchNextPage();
        if (!res?.data?.pages) break;
      }
      const pages = feedQuery.data?.pages ?? [];
      const items = pages.flatMap((p) => p.transactions ?? []);

      const header = 'Title,Group,Date,Amount\n';
      const rows = items
        .map((t) => {
          const title = String(t.title ?? '').replace(/"/g, '""');
          const group = String(t.groupName ?? '').replace(/"/g, '""');
          const when = new Date(t.date).toLocaleString();
          return `"${title}","${group}","${when}",${t.amount}`;
        })
        .join('\n');
      const csv = header + rows;

      const fileUri = `${FileSystem.documentDirectory}transactions_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      console.error('CSV export failed', e);
    } finally {
      downloadingRef.current = false;
    }
  }, [feedQuery]);

  /* ----------------------------------- UI ---------------------------------- */

  const Header = (
    <View style={styles.headerWrap}>
      <View className="flex-row gap-3" style={styles.cardsRow}>
        <SummaryCard title="Total Spent" value={formatRs(totals.totalSpent)} type="total" />
        <SummaryCard title="You Owe" value={formatRs(totals.youOwe)} type="you" />
        <SummaryCard title="Friends Owe" value={formatRs(totals.friendsOwe)} type="friend" />
      </View>

      {/* Controls row — EXACT same structure & styles as your reference */}
      <View style={styles.controlsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
          style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => setPicker({ mode: 'start' })}
            style={[styles.pillBtn, styles.pillFlexible]}>
            <Ionicons name="calendar-outline" size={16} color="#4B5563" />
            <Text style={styles.pillText} numberOfLines={1}>
              {startDate ? fmtShort(startDate) : 'Start Date'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPicker({ mode: 'end' })}
            style={[styles.pillBtn, styles.pillFlexible]}>
            <Ionicons name="calendar-outline" size={16} color="#4B5563" />
            <Text style={styles.pillText} numberOfLines={1}>
              {endDate ? fmtShort(endDate) : 'End Date'}
            </Text>
          </TouchableOpacity>

          {/* Reset date window */}
          {!isDateWindowDefault && (
            <TouchableOpacity
              onPress={resetDateWindow}
              style={[styles.pillBtn, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="refresh-outline" size={16} color="#6C5CE7" />
              <Text style={[styles.pillText, { color: '#6C5CE7' }]}>Reset</Text>
            </TouchableOpacity>
          )}

          {/* Reset month filter */}
          {monthFilterKey !== null && (
            <TouchableOpacity
              onPress={resetMonthFilter}
              style={[styles.pillBtn, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="refresh-outline" size={16} color="#6C5CE7" />
              <Text style={[styles.pillText, { color: '#6C5CE7' }]}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <TouchableOpacity onPress={downloadReport} style={styles.downloadBtn}>
          <Ionicons name="download-outline" size={18} color="#6C5CE7" />
          {!showReset && (
            <Text style={[styles.pillText, { color: '#6C5CE7', marginLeft: 6 }]}>Download</Text>
          )}
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={!!picker.mode}
        mode="date"
        onConfirm={(d) => {
          if (picker.mode === 'start') setStartDate(startOfDay(d));
          else if (picker.mode === 'end') setEndDate(endOfDay(d));
          setSelectedBarIndex(null);
          setMonthFilterKey(null);
          setPicker({ mode: null });
        }}
        onCancel={() => setPicker({ mode: null })}
      />

      {/* Chart */}
      <View style={styles.chartCard}>
        <BarChart
          data={barData}
          height={200}
          maxValue={yMax}
          noOfSections={4}
          spacing={26}
          initialSpacing={26}
          endSpacing={26}
          labelWidth={36}
          barBorderRadius={10}
          yAxisThickness={1}
          yAxisColor="#E5E7EB"
          yAxisLabelTexts={ticks}
          rulesType="dashed"
          dashWidth={6}
          dashGap={6}
          xAxisThickness={0}
          xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 12, marginTop: 6 }}
          onPress={onPressBar}
          focusedBarIndex={selectedBarIndex ?? -1}
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
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={!!(headerQuery.isRefetching || feedQuery.isRefetching)}
          onRefresh={onRefresh}
        />
      }
      contentContainerStyle={{ paddingBottom: 12 }}
      removeClippedSubviews={Platform.OS === 'android'}
      windowSize={7}
      initialNumToRender={12}
      showsVerticalScrollIndicator={false}
    />
  );
}

/* ---------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  headerWrap: { paddingTop: 12 },

  /* summary cards row */
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },

  /* date + download (same as your reference) */
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 6,
  },
  pillFlexible: {
    flexShrink: 1,
    maxWidth: 150,
  },
  pillText: { marginLeft: 6, color: '#4B5563', fontSize: 13, fontWeight: '600' },

  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    minWidth: 40,
  },

  /* chart card */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
});
