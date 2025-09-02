// WalletSummary.tsx
import AppHeader from '@/lib/shared/components/AppHeader';
import { useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

// ---------- Helpers ----------
type Txn = {
  id: string;
  name: string;
  date: string; // ISO string
  amount: number; // + = credit, - = debit
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;

// simple ₹ formatter
const formatRs = (n: number) =>
  `₹${Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

// "18 Jun · 14:20"
const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm}`;
};

// ---------- Mock data (lots) ----------
const NAMES = [
  'Anisha Singh',
  'Alok Mehra',
  'Rohit Verma',
  'Priya Nair',
  'Neha Kapoor',
  'Kunal Shah',
  'Meera Iyer',
  'Amit Kulkarni',
  'Isha Rao',
  'Vikas Gupta',
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// create 60 transactions across Jan–Jun with mixed credits/debits
const MOCK_TXNS: Txn[] = Array.from({ length: 60 }).map((_, i) => {
  const month = rand(0, 5); // Jan..Jun
  const day = rand(1, 28);
  const hour = rand(8, 21);
  const minute = rand(0, 59);
  const name = NAMES[rand(0, NAMES.length - 1)];
  const isDebit = Math.random() > 0.45; // mostly expenses
  const base = rand(100, 2500);
  const amount = isDebit ? -base : base;
  const iso = new Date(2025, month, day, hour, minute).toISOString();
  return { id: `${i + 1}`, name, date: iso, amount };
});

// ---------- Component ----------
export default function WalletSummary() {
  const navigation = useNavigation();

  const [selected, setSelected] = useState<number | null>(null);

  // sort txns by date desc for the list
  const txns = useMemo(
    () => [...MOCK_TXNS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    []
  );

  // aggregate monthly totals from the SAME dataset
  const monthlyTotals = useMemo(() => {
    const arr = new Array(6).fill(0);
    for (const t of txns) {
      const m = new Date(t.date).getMonth(); // 0..11
      if (m <= 5) {
        // choose one of the lines below:
        arr[m] += Math.abs(t.amount); // visual volume (credits+debits)
        // arr[m] += t.amount;        // net flow (credits - debits)
      }
    }
    return arr;
  }, [txns]);

  const max = Math.max(...monthlyTotals, 0);
  const yMax = Math.max(1000, Math.ceil((max * 1.2) / 1000) * 1000); // +20% headroom

  // Build k-style ticks: ["0k","2k","4k","6k","8k"]
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
        frontColor: i === 4 ? '#6C5CE7' : 'rgba(108,92,231,0.28)', // highlight May
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
      {/* ===== Chart (driven by txns) ===== */}
      <BarChart
        data={barData}
        height={200}
        maxValue={yMax}
        noOfSections={4}
        // spacing so labels aren't clipped at edges
        spacing={26}
        initialSpacing={32}
        endSpacing={52} // more right-side room
        labelWidth={36}
        barBorderRadius={10}
        // axis + grid (unchanged)
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
        onPress={(_: any, index: number | null) => setSelected((p) => (p === index ? null : index))}
        focusedBarIndex={selected ?? -1}
        renderTooltip={(item: { value: any }, index: number) =>
          selected !== null ? (
            <View
              style={[
                styles.tooltip,
                // If the bar is near the right edge, shift tooltip left a bit
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

      {/* ===== Transactions (same dataset) ===== */}
      <Text style={styles.title}>Transactions</Text>
      <FlatList
        data={txns}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isNegative = item.amount < 0;
          return (
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.date}>{formatWhen(item.date)}</Text>
              </View>
              <Text style={[styles.amount, isNegative ? styles.neg : styles.pos]}>
                {isNegative ? '-' : '+'}
                {formatRs(item.amount)}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  separator: { height: 1, backgroundColor: '#EEE' },
  name: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 13, color: '#80848F', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  pos: { color: '#14A44D' },
  neg: { color: '#D93025' },
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#6C5CE7',
  },
  tooltipText: { color: 'white', fontWeight: '700' },
});
