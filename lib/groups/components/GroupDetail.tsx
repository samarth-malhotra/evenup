import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import WaveHeader from "@/lib/shared/components/WaveHeader";

// --- mock groups & expenses (replace with API) ---
const GROUPS = [
  {
    id: "1",
    name: "Office Friends",
    members: ["Rohan", "Juhi", "Aadi"],
    avatar: "https://i.pravatar.cc/96?img=5",
  },
  {
    id: "2",
    name: "College Buddies",
    members: ["Riya", "Sam", "Kavya"],
    avatar: "https://i.pravatar.cc/96?img=14",
  },
  {
    id: "3",
    name: "Family Trip",
    members: ["Mom", "Dad", "Sis"],
    avatar: "https://i.pravatar.cc/96?img=28",
  },
  {
    id: "4",
    name: "Weekend Getaway",
    members: ["Dev", "Neha", "Raj"],
    avatar: "https://i.pravatar.cc/96?img=31",
  },
  {
    id: "5",
    name: "School Reunion",
    members: ["You", "Classmates"],
    avatar: "https://i.pravatar.cc/96?img=47",
  },
];

const EXPENSES: Record<
  string,
  { id: string; title: string; by: string; amount: number; date: string }[]
> = {
  "1": [
    { id: "e1", title: "Dinner at BBQ", by: "Rohan", amount: 850, date: "Today" },
    { id: "e2", title: "Cab back home", by: "Juhi", amount: 260, date: "Yesterday" },
  ],
  "2": [{ id: "e3", title: "Movie tickets", by: "Sam", amount: 600, date: "2d ago" }],
  "3": [{ id: "e4", title: "Fuel", by: "Dad", amount: 1200, date: "3d ago" }],
  "4": [{ id: "e5", title: "Resort booking", by: "Dev", amount: 5200, date: "5d ago" }],
  "5": [],
};

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useMemo(() => GROUPS.find((g) => g.id === id) ?? GROUPS[0], [id]);
  const items = EXPENSES[group.id] ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ position: "relative" }}>
        <WaveHeader />
        {/* back + actions */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="user-plus" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="more-horizontal" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* group card floating */}
        <View style={styles.groupCard}>
          <Image source={{ uri: group.avatar }} style={styles.groupAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={styles.groupMembers} numberOfLines={1}>
              {group.members.join(" • ")}
            </Text>
          </View>
          <TouchableOpacity style={styles.pillOutline}>
            <Text style={styles.pillOutlineText}>Settle Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Balances summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard]}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={[styles.summaryAmount, { color: "#sss" }]}>₹ 4,250</Text>
        </View>
        <View style={[styles.summaryCard]}>
          <Text style={styles.summaryLabel}>You owe</Text>
          <Text style={[styles.summaryAmount, { color: "#EA580C" }]}>₹ 1,250</Text>
        </View>
        <View style={[styles.summaryCard]}>
          <Text style={styles.summaryLabel}>Friends owe</Text>
          <Text style={[styles.summaryAmount, { color: "#059669" }]}>₹ 3,400</Text>
        </View>
      </View>

      {/* Recent expenses */}
      <View style={{ paddingHorizontal: 16, marginTop: 4, flex: 1 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/home/expenseDetails")}>
            <Text style={styles.sectionAction}>View all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={styles.expenseIcon}>
                <Feather name="tag" size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.expenseSub}>
                  {item.by} • {item.date}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>₹ {item.amount}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ color: "#9CA3AF", fontWeight: "600" }}>No expenses yet</Text>
            </View>
          }
        />
      </View>

      {/* bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.cta, { backgroundColor: "#6C4CE6" }]}>
          <Text style={styles.ctaText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cta, styles.ctaGhost]}>
          <Text style={[styles.ctaText, { color: "#111827" }]}>Split by Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  groupCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: -28,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  groupAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  groupName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  groupMembers: { color: "#6B7280", marginTop: 2 },
  pillOutline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillOutlineText: { fontWeight: "700", color: "#111827" },

  summaryRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 40 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: { color: "#6B7280", marginBottom: 6 },
  summaryAmount: { fontSize: 22, fontWeight: "800" },

  sectionHeader: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sectionAction: { color: "#6C4CE6", fontWeight: "700" },

  expenseCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  expenseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  expenseTitle: { fontWeight: "700", color: "#111827" },
  expenseSub: { color: "#6B7280", marginTop: 2 },
  expenseAmount: { fontWeight: "800" },

  bottomBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  cta: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800" },
  ctaGhost: { backgroundColor: "#F3F4F6" },
});
