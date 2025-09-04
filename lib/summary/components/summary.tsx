// WalletSummary.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// ---------- Categories ----------
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
  date: string; // ISO string
  amount: number; // + = you received, - = you owe
  group?: string;
  category: CategoryKey;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;

// ---------- Helpers ----------
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

// ---------- Mock API JSON (all with groups) ----------
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

// ---------- Component ----------
export default function WalletSummary() {
  const [selected, setSelected] = useState<number | null>(null); // already used for tooltip
  const [monthFilter, setMonthFilter] = useState<number | null>(null); // <-- new state

  // Date range state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picker, setPicker] = useState<{ mode: 'start' | 'end' | null }>({ mode: null });

  // Filtered transactions by date range + month filter
  const txns = useMemo(() => {
    return [...MOCK_TXNS]
      .filter((t) => {
        const d = new Date(t.date);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (monthFilter !== null && d.getMonth() !== monthFilter) return false; // <-- month filter
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [startDate, endDate, monthFilter]);

  // Totals
  const totals = useMemo(() => {
    let owe = 0,
      get = 0;
    for (const t of txns) {
      if (t.amount < 0) owe += Math.abs(t.amount);
      else get += t.amount;
    }
    return { owe, get };
  }, [txns]);

  // Aggregate monthly totals
  const monthlyTotals = useMemo(() => {
    const arr = new Array(6).fill(0);
    for (const t of txns) {
      const m = new Date(t.date).getMonth();
      if (m <= 5) {
        arr[m] += Math.abs(t.amount);
      }
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
      MONTHS.slice(0, 6).map((label, i) => ({
        value: monthlyTotals[i],
        label,
        barWidth: 28,
        frontColor: i === 4 ? '#6C5CE7' : 'rgba(108,92,231,0.28)',
      })),
    [monthlyTotals]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerBackTitleVisible: false,
      header: () => <AppHeader title="Summary" showBackButton />,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* ===== Summary Row ===== */}
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>You Owe</Text>
          <Text style={[styles.summaryValue, styles.neg]}>{formatRs(totals.owe)}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>You Will Get</Text>
          <Text style={[styles.summaryValue, styles.pos]}>{formatRs(totals.get)}</Text>
        </View>
      </View>

      {/* ===== Date Range Picker ===== */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => setPicker({ mode: 'start' })}>
          <Text style={styles.dateBtn}>{startDate ? startDate.toDateString() : 'Start Date'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPicker({ mode: 'end' })}>
          <Text style={styles.dateBtn}>{endDate ? endDate.toDateString() : 'End Date'}</Text>
        </TouchableOpacity>
        {(startDate || endDate) && (
          <TouchableOpacity
            onPress={() => {
              setStartDate(null);
              setEndDate(null);
            }}>
            <Text style={[styles.dateBtn, { color: '#6C5CE7' }]}>Clear</Text>
          </TouchableOpacity>
        )}
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

      {/* ===== Chart ===== */}
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
        onPress={(_, index) => {
          setSelected((p) => (p === index ? null : index));
          setMonthFilter(index); // <-- set month filter
        }}
        focusedBarIndex={selected ?? -1}
        renderTooltip={(item: { value: any }, index: number) =>
          selected !== null ? (
            <View
              style={[
                styles.tooltip,
                (index >= barData.length - 1 || index === barData.length - 2) && {
                  transform: [{ translateX: -24 }],
                },
              ]}>
              <Text style={styles.tooltipText}>{formatRs(item?.value ?? 0)}</Text>
            </View>
          ) : null
        }
        isAnimated
      />

      {/* ===== Reset Filter Button ===== */}
      {monthFilter !== null && (
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            setMonthFilter(null);
            setSelected(null);
          }}>
          <Text style={styles.resetText}>Reset Filter</Text>
        </TouchableOpacity>
      )}

      {/* ===== Transactions ===== */}
      <Text style={styles.title}>
        {monthFilter !== null ? `Transactions for ${MONTHS[monthFilter]}` : 'All Transactions'}
      </Text>

      <FlatList
        data={txns}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isNegative = item.amount < 0;
          return (
            <View style={styles.row}>
              <Ionicons
                name={CATEGORY_ICONS[item.category]}
                size={24}
                color="#6C5CE7"
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.group && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="people" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.group}>{item.group}</Text>
                  </View>
                )}
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
      />
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  dateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    color: '#333',
    marginRight: 8,
  },
  title: { fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    alignItems: 'center',
  },
  separator: { height: 1, backgroundColor: '#EEE' },
  name: { fontSize: 16, fontWeight: '600' },
  group: { fontSize: 13, color: '#6B7280' },
  date: { fontSize: 13, color: '#80848F', marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', textAlign: 'right', maxWidth: 140 },
  pos: { color: '#14A44D' },
  neg: { color: '#D93025' },
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#6C5CE7',
  },
  tooltipText: { color: 'white', fontWeight: '700' },
  resetBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  resetText: {
    fontSize: 13,
    color: '#6C5CE7',
    fontWeight: '600',
  },
});
