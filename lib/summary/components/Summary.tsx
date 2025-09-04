// WalletSummary.tsx
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

const CATEGORY_ICONS = {
  groceries: 'cart-outline',
  kitchen: 'restaurant-outline',
  bills: 'document-text-outline',
  travel: 'airplane-outline',
  entertainment: 'musical-notes-outline',
} as const;

type CategoryKey = keyof typeof CATEGORY_ICONS;

type Txn = {
  id: string;
  name: string;
  date: string; // ISO
  amount: number; // + = you received, - = you owe
  group: string;
  category: CategoryKey;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;

const formatRs = (n: number) =>
  `₹${Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm}`;
};

const fmtShort = (d?: Date | null) =>
  d
    ? d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

/* -------------------------------------------------------------------------- */
/* Data (all with groups, Jan–Jun)                                            */
/* -------------------------------------------------------------------------- */

const MOCK_TXNS: Txn[] = [
  // January
  {
    id: '1',
    name: 'Anisha Singh',
    date: '2025-01-03T10:15:00Z',
    amount: -450,
    group: 'Bangalore Team',
    category: 'groceries',
  },
  {
    id: '2',
    name: 'Alok Mehra',
    date: '2025-01-08T14:20:00Z',
    amount: 1200,
    group: 'Delhi Friends',
    category: 'bills',
  },
  {
    id: '3',
    name: 'Neha Kapoor',
    date: '2025-01-12T09:30:00Z',
    amount: 2000,
    group: 'Chennai Club',
    category: 'travel',
  },
  {
    id: '4',
    name: 'Rohit Verma',
    date: '2025-01-18T18:45:00Z',
    amount: -900,
    group: 'Mumbai Team',
    category: 'kitchen',
  },
  {
    id: '5',
    name: 'Priya Nair',
    date: '2025-01-22T11:00:00Z',
    amount: 850,
    group: 'Hyderabad Group',
    category: 'entertainment',
  },
  {
    id: '6',
    name: 'Kunal Shah',
    date: '2025-01-28T20:25:00Z',
    amount: -3000,
    group: 'Delhi Friends',
    category: 'bills',
  },
  // February
  {
    id: '7',
    name: 'Meera Iyer',
    date: '2025-02-04T15:10:00Z',
    amount: 1500,
    group: 'Chennai Club',
    category: 'groceries',
  },
  {
    id: '8',
    name: 'Amit Kulkarni',
    date: '2025-02-08T08:40:00Z',
    amount: -600,
    group: 'Mumbai Team',
    category: 'travel',
  },
  {
    id: '9',
    name: 'Isha Rao',
    date: '2025-02-12T12:00:00Z',
    amount: 2500,
    group: 'Bangalore Team',
    category: 'kitchen',
  },
  {
    id: '10',
    name: 'Vikas Gupta',
    date: '2025-02-15T19:30:00Z',
    amount: -750,
    group: 'Hyderabad Group',
    category: 'entertainment',
  },
  {
    id: '11',
    name: 'Anisha Singh',
    date: '2025-02-20T10:00:00Z',
    amount: 1800,
    group: 'Delhi Friends',
    category: 'groceries',
  },
  {
    id: '12',
    name: 'Alok Mehra',
    date: '2025-02-27T16:15:00Z',
    amount: -500,
    group: 'Mumbai Team',
    category: 'bills',
  },
  // March
  {
    id: '13',
    name: 'Neha Kapoor',
    date: '2025-03-05T09:45:00Z',
    amount: 3200,
    group: 'Chennai Club',
    category: 'travel',
  },
  {
    id: '14',
    name: 'Rohit Verma',
    date: '2025-03-08T11:30:00Z',
    amount: -1800,
    group: 'Hyderabad Group',
    category: 'kitchen',
  },
  {
    id: '15',
    name: 'Priya Nair',
    date: '2025-03-12T14:00:00Z',
    amount: 950,
    group: 'Delhi Friends',
    category: 'entertainment',
  },
  {
    id: '16',
    name: 'Kunal Shah',
    date: '2025-03-18T20:00:00Z',
    amount: -2200,
    group: 'Bangalore Team',
    category: 'bills',
  },
  {
    id: '17',
    name: 'Meera Iyer',
    date: '2025-03-22T18:20:00Z',
    amount: 1200,
    group: 'Mumbai Team',
    category: 'groceries',
  },
  {
    id: '18',
    name: 'Amit Kulkarni',
    date: '2025-03-27T09:10:00Z',
    amount: -950,
    group: 'Hyderabad Group',
    category: 'travel',
  },
  // April
  {
    id: '19',
    name: 'Isha Rao',
    date: '2025-04-02T13:45:00Z',
    amount: 1750,
    group: 'Chennai Club',
    category: 'kitchen',
  },
  {
    id: '20',
    name: 'Vikas Gupta',
    date: '2025-04-06T19:00:00Z',
    amount: -650,
    group: 'Delhi Friends',
    category: 'entertainment',
  },
  {
    id: '21',
    name: 'Anisha Singh',
    date: '2025-04-09T10:45:00Z',
    amount: 1450,
    group: 'Bangalore Team',
    category: 'groceries',
  },
  {
    id: '22',
    name: 'Alok Mehra',
    date: '2025-04-14T09:30:00Z',
    amount: -1200,
    group: 'Hyderabad Group',
    category: 'bills',
  },
  {
    id: '23',
    name: 'Neha Kapoor',
    date: '2025-04-19T14:30:00Z',
    amount: 2800,
    group: 'Mumbai Team',
    category: 'travel',
  },
  {
    id: '24',
    name: 'Rohit Verma',
    date: '2025-04-24T11:45:00Z',
    amount: -1100,
    group: 'Chennai Club',
    category: 'kitchen',
  },
  // May
  {
    id: '25',
    name: 'Priya Nair',
    date: '2025-05-02T17:20:00Z',
    amount: 1350,
    group: 'Delhi Friends',
    category: 'entertainment',
  },
  {
    id: '26',
    name: 'Kunal Shah',
    date: '2025-05-08T21:15:00Z',
    amount: -2500,
    group: 'Bangalore Team',
    category: 'bills',
  },
  {
    id: '27',
    name: 'Meera Iyer',
    date: '2025-05-12T15:30:00Z',
    amount: 900,
    group: 'Hyderabad Group',
    category: 'groceries',
  },
  {
    id: '28',
    name: 'Amit Kulkarni',
    date: '2025-05-16T10:20:00Z',
    amount: -1400,
    group: 'Mumbai Team',
    category: 'travel',
  },
  {
    id: '29',
    name: 'Isha Rao',
    date: '2025-05-22T13:50:00Z',
    amount: 2100,
    group: 'Chennai Club',
    category: 'kitchen',
  },
  {
    id: '30',
    name: 'Vikas Gupta',
    date: '2025-05-28T20:00:00Z',
    amount: -500,
    group: 'Delhi Friends',
    category: 'entertainment',
  },
  // June
  {
    id: '31',
    name: 'Anisha Singh',
    date: '2025-06-03T09:30:00Z',
    amount: 1600,
    group: 'Bangalore Team',
    category: 'groceries',
  },
  {
    id: '32',
    name: 'Alok Mehra',
    date: '2025-06-08T11:15:00Z',
    amount: -700,
    group: 'Hyderabad Group',
    category: 'bills',
  },
  {
    id: '33',
    name: 'Neha Kapoor',
    date: '2025-06-14T18:45:00Z',
    amount: 2400,
    group: 'Chennai Club',
    category: 'travel',
  },
  {
    id: '34',
    name: 'Rohit Verma',
    date: '2025-06-18T20:10:00Z',
    amount: -1350,
    group: 'Mumbai Team',
    category: 'kitchen',
  },
  {
    id: '35',
    name: 'Priya Nair',
    date: '2025-06-22T12:30:00Z',
    amount: 1000,
    group: 'Delhi Friends',
    category: 'entertainment',
  },
  {
    id: '36',
    name: 'Kunal Shah',
    date: '2025-06-28T16:20:00Z',
    amount: -2750,
    group: 'Bangalore Team',
    category: 'bills',
  },
];

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function WalletSummary() {
  const listRef = useRef<FlatList<Txn>>(null);

  // chart / filters
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [monthFilter, setMonthFilter] = useState<number | null>(null);

  // date range
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picker, setPicker] = useState<{ mode: 'start' | 'end' | null }>({ mode: null });

  // should the download shrink to icon-only?
  const showReset = !!startDate || !!endDate || monthFilter !== null;

  // filtered txns (date + month)
  const txns = useMemo(() => {
    return [...MOCK_TXNS]
      .filter((t) => {
        const d = new Date(t.date);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (monthFilter !== null && d.getMonth() !== monthFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [startDate, endDate, monthFilter]);

  // scroll to top when filters change
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [monthFilter, startDate, endDate]);

  // totals
  const totals = useMemo(() => {
    let owe = 0,
      get = 0,
      spent = 0;
    for (const t of txns) {
      spent += Math.abs(t.amount);
      if (t.amount < 0) owe += Math.abs(t.amount);
      else get += t.amount;
    }
    return { owe, get, spent };
  }, [txns]);

  // monthly totals for chart
  const monthlyTotals = useMemo(() => {
    const arr = new Array(6).fill(0);
    for (const t of txns) {
      const m = new Date(t.date).getMonth();
      if (m <= 5) arr[m] += Math.abs(t.amount);
    }
    return arr;
  }, [txns]);

  const max = Math.max(...monthlyTotals, 0);
  const yMax = Math.max(1000, Math.ceil((max * 1.2) / 1000) * 1000);
  const yTicks = useMemo(() => {
    const sections = 4;
    const step = Math.round(yMax / sections);
    return Array.from({ length: sections + 1 }, (_, i) => `${Math.round((i * step) / 1000)}k`);
  }, [yMax]);

  const barData = useMemo(
    () =>
      MONTHS.map((label, i) => ({
        value: monthlyTotals[i],
        label,
        barWidth: 28,
        frontColor: i === 4 ? '#6C5CE7' : 'rgba(108,92,231,0.28)',
      })),
    [monthlyTotals]
  );

  // csv download of *currently filtered* txns
  const downloadReport = async () => {
    try {
      const header = 'Name,Group,Category,Date,Amount,Type\n';
      const rows = txns
        .map((t) => {
          const type = t.amount < 0 ? 'You Owe' : 'You Received';
          return `${t.name},"${t.group}",${t.category},${new Date(t.date).toLocaleString()},${formatRs(
            t.amount
          )},${type}`;
        })
        .join('\n');
      const csv = header + rows;
      const fileUri = FileSystem.documentDirectory + 'transactions_report.csv';
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      console.error(e);
    }
  };

  /* ------------------------------- Header UI ------------------------------ */

  const Header = (
    <View style={styles.headerWrap}>
      {/* summary cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.shadow]}>
          <Text style={styles.cardTitle}>Total Spent</Text>
          <Text style={[styles.cardValue, { color: '#5B61FF' }]}>{formatRs(totals.spent)}</Text>
        </View>
        <View style={[styles.card, styles.shadow]}>
          <Text style={styles.cardTitle}>You Owe</Text>
          <Text style={[styles.cardValue, { color: '#F97316' }]}>{formatRs(totals.owe)}</Text>
        </View>
        <View style={[styles.card, styles.shadow]}>
          <Text style={styles.cardTitle}>Friends Owe</Text>
          <Text style={[styles.cardValue, { color: '#10B981' }]}>{formatRs(totals.get)}</Text>
        </View>
      </View>

      {/* date controls + resets + download */}
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

          {(startDate || endDate) && (
            <TouchableOpacity
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
              }}
              style={[styles.pillBtn, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="refresh-outline" size={16} color="#6C5CE7" />
              <Text style={[styles.pillText, { color: '#6C5CE7' }]}>Reset</Text>
            </TouchableOpacity>
          )}

          {monthFilter !== null && (
            <TouchableOpacity
              onPress={() => {
                setMonthFilter(null);
                setSelectedBar(null);
              }}
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
          if (picker.mode === 'start') setStartDate(d);
          else if (picker.mode === 'end') setEndDate(d);
          setPicker({ mode: null });
        }}
        onCancel={() => setPicker({ mode: null })}
      />

      {/* chart card */}
      <View style={[styles.chartCard, styles.shadow]}>
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
          yAxisTextStyle={{ color: '#9AA0A6', fontSize: 10 }}
          yAxisLabelTexts={yTicks}
          rulesColor="#E9E9EF"
          rulesType="dashed"
          dashWidth={6}
          dashGap={6}
          xAxisThickness={0}
          xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 12, marginTop: 6 }}
          onPress={(_: any, index: any) => {
            setSelectedBar((p) => (p === index ? null : index));
            setMonthFilter(index);
          }}
          focusedBarIndex={selectedBar ?? -1}
          renderTooltip={(item: any) => (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>{formatRs(item?.value ?? 0)}</Text>
            </View>
          )}
          isAnimated
        />
      </View>

      <Text style={styles.sectionTitle}>
        {monthFilter !== null ? `Transactions for ${MONTHS[monthFilter]}` : 'Transactions'}
      </Text>
    </View>
  );

  /* ------------------------------- Render -------------------------------- */

  return (
    <FlatList
      ref={listRef}
      style={{ flex: 1, backgroundColor: '#F6F4FF' }}
      contentContainerStyle={{ paddingBottom: 32 }}
      data={txns}
      keyExtractor={(it) => it.id}
      ListHeaderComponent={Header}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const isNegative = item.amount < 0;
        return (
          <View style={[styles.txnRow]}>
            <View style={[styles.iconCircle]}>
              <Ionicons name={CATEGORY_ICONS[item.category]} size={18} color="#6C5CE7" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="people" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.group}>{item.group}</Text>
              </View>
              <Text style={styles.date}>{formatWhen(item.date)}</Text>
            </View>

            <Text style={[styles.amount, isNegative ? styles.neg : styles.pos]}>
              {isNegative
                ? `You owe ${formatRs(item.amount)}`
                : `You received ${formatRs(item.amount)}`}
            </Text>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={{ color: '#6B7280', paddingHorizontal: 16, paddingVertical: 12 }}>
          No transactions
        </Text>
      }
      nestedScrollEnabled
      initialNumToRender={12}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      showsVerticalScrollIndicator={false}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  /* summary cards row */
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: { color: '#6B7280', fontSize: 12, marginBottom: 6 },
  cardValue: { fontSize: 18, fontWeight: '800' },

  /* date + download */
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
    minWidth: 40, // stay tappable when text is hidden
  },

  /* chart card */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#6C5CE7',
  },
  tooltipText: { color: 'white', fontWeight: '700' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
  },

  /* transactions list */
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  separator: { height: 10, backgroundColor: '#F6F4FF' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  group: { fontSize: 13, color: '#6B7280' },
  date: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  amount: { fontSize: 13, fontWeight: '800', textAlign: 'right', maxWidth: 160 },
  pos: { color: '#10B981' },
  neg: { color: '#EF4444' },

  /* subtle shadow like iOS cards */
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
