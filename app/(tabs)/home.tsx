// app/(tabs)/index.tsx  — Expo Router
import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";
import WaveHeader from "@/lib/shared/components/waveHeader";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// import { LinearGradient } from "expo-linear-gradient";
// import WaveHeader from "../../../components/waveHeader";
// import ThemedSafeArea from "../../lib/shared/components/ThemedSafeArea";
// import WavyHeader from "../../lib/shared/components/waveHeader";

const COLORS = {
  bg: "#F5F3FF",
  purple: "#6C4CE6",
  purpleDark: "#5336D3",
  card: "#FFFFFF",
  text: "#1A1A1A",
  subtext: "#6B7280",
  owe: "#FF6B3D",
  owed: "#10B981",
  chip: "#F3F4F6",
  divider: "#E5E7EB",
};

const groups = [
  { id: "1", name: "Office Friends", color: "#FFE4D6" },
  { id: "2", name: "College Buddies", color: "#E6EBFF" },
  { id: "3", name: "Family Trip", color: "#FFEADF" },
  { id: "4", name: "Gym Gang", color: "#EAFDF2" },
];

const quickLinks = [
  {
    id: "add",
    label: "Add Bill",
    icon: <Ionicons name="flash" size={22} />,
    link: "../addBills",
  },
  {
    id: "reports",
    label: "Reports",
    icon: <MaterialIcons name="bar-chart" size={22} />,
    link: "../summary",
  },
  {
    id: "settle",
    label: "Create Group",
    icon: <Feather name="plus" size={22} />,
    link: "../addBills",
  },
];

export default function HomeScreen() {
  return (
    <ThemedSafeArea bg="bg" statusBarStyle="dark" scroll>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Wave Header */}
        <WaveHeader height={200} />

        <View
          style={{
            paddingInline: 16,
            paddingBottom: 4,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            overflow: "hidden",
          }}
        >
          <Text style={styles.hello}>
            Hi, <Text style={{ fontWeight: "800" }}>Rohan</Text> 👋
          </Text>
          {/* your two summary cards */}
          <View style={{ flexDirection: "row", gap: 14 }}>
            <SummaryCard
              title="You owe"
              amount="₹ 1,250"
              amountColor="#FF6B3D"
            />
            <SummaryCard
              title="Friends owe you"
              amount="₹ 3,400"
              amountColor="#10B981"
            />
          </View>
        </View>

        {/* Recent groups */}
        <SectionHeader title="Recent groups" actionIcon />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}
        >
          {groups.map((g) => (
            <TouchableOpacity key={g.id} style={{ alignItems: "center" }}>
              <View style={[styles.groupBubble, { backgroundColor: g.color }]}>
                <Ionicons name="people" size={28} />
              </View>
              <Text style={styles.groupLabel} numberOfLines={1}>
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick links */}
        <SectionHeader title="Quick links" />
        <View style={styles.quickGrid}>
          {quickLinks.map((q) => (
            <Link href={q.link} asChild key={q.id}>
              <TouchableOpacity style={styles.quickItem} activeOpacity={0.85}>
                <>
                  <View style={styles.quickIcon}>{q.icon}</View>
                  <Text style={styles.quickText}>{q.label}</Text>
                </>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>
    </ThemedSafeArea>
  );
}

function SummaryCard({
  title,
  amount,
  amountColor,
}: {
  title: string;
  amount: string;
  amountColor: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryAmount, { color: amountColor }]}>
        {amount}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  actionIcon = false,
}: {
  title: string;
  actionIcon?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionIcon && (
        <TouchableOpacity>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingBottom: 12 },
  header: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff" },
  hello: {
    fontSize: 28,
    color: "#000",
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  summaryRow: { flexDirection: "row", gap: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    alignItems: "center",
  },
  summaryTitle: {
    color: COLORS.subtext,
    fontSize: 16,
    marginBottom: 6,
    fontWeight: "800",
  },
  summaryAmount: { fontSize: 26, fontWeight: "800" },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  groupBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  groupLabel: {
    marginTop: 8,
    width: 90,
    textAlign: "center",
    color: COLORS.text,
  },
  quickGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    // flexWrap: "wrap",
    // gap: 14,
  },
  quickItem: {
    // maxWidth: "22%",
    width: "23%",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    marginRight: "3%",
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.chip,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  activitySub: { color: COLORS.subtext, marginTop: 2 },
  activityRightTitle: { color: COLORS.subtext, fontSize: 13 },
  activityRightAmount: { fontWeight: "700", marginTop: 2 },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});
