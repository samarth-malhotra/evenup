// WalletSummary.tsx
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const VALUES = [4000, 6000, 4500, 6500, 7000, 2500];

const transactions = [
  { id: "1", name: "Anisha Singh", date: "18 Jun · 14:20", amount: 500 },
  { id: "2", name: "Alok Mehra", date: "16 Jun · 09:45", amount: -1200 },
];

const formatRs = (n: number) =>
  `₹${Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

export default function WalletSummary() {
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(...VALUES);
  const yMax = Math.ceil((max + 400) / 1000) * 1000;

  const yTicks = useMemo(() => {
    const sections = 4;
    const step = Math.round(yMax / sections);
    return Array.from({ length: sections + 1 }, (_, i) => `${i * step}`);
  }, [yMax]);

  const barData = VALUES.map((v, i) => ({
    value: v,
    label: MONTHS[i],
    barWidth: 28,
    frontColor: i === 4 ? "#6C5CE7" : "rgba(108,92,231,0.28)", // highlight May
  }));

  return (
    <View style={styles.container}>
      {/* ===== Chart ===== */}
      <BarChart
        data={barData}
        height={200}
        maxValue={yMax}
        noOfSections={4}
        spacing={26}
        initialSpacing={28}
        endSpacing={28}
        labelWidth={36}
        barBorderRadius={10}
        // Show Y axis + dashed grid
        yAxisThickness={1}
        yAxisColor="#E5E7EB"
        yAxisTextStyle={{ color: "#9AA0A6", fontSize: 10 }}
        yAxisLabelTexts={yTicks}
        rulesColor="#E9E9EF"
        rulesType="dashed"
        dashWidth={6}
        dashGap={6}
        xAxisThickness={0}
        xAxisLabelTextStyle={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}
        // Interactivity: tap to show/hide tooltip value
        onPress={(item, index) => setSelected((p) => (p === index ? null : index))}
        focusedBarIndex={selected ?? -1}
        renderTooltip={(item) =>
          selected !== null ? (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>{formatRs(item?.value ?? 0)}</Text>
            </View>
          ) : null
        }
        isAnimated
      />

      {/* ===== Transactions ===== */}
      <Text style={styles.title}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isNegative = item.amount < 0;
          return (
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <Text style={[styles.amount, isNegative ? styles.neg : styles.pos]}>
                {isNegative ? "-" : "+"}
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
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 8, marginBottom: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  separator: { height: 1, backgroundColor: "#EEE" },
  name: { fontSize: 16, fontWeight: "600" },
  date: { fontSize: 13, color: "#80848F", marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "800" },
  pos: { color: "#14A44D" },
  neg: { color: "#D93025" },
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#6C5CE7",
  },
  tooltipText: { color: "white", fontWeight: "700" },
});
