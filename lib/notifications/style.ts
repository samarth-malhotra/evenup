import { StyleSheet } from "react-native";

import { COLORS } from "../../theme/color";

export const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text ?? "#1A1A1A",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  markAllText: { fontWeight: "600" },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  rowUnread: {
    backgroundColor: "#F7F6FF", // subtle tint for unread
  },
  rowRead: {
    backgroundColor: "#FFFFFF",
  },
  separator: {
    height: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 15.5,
    color: "#1A1A1A",
  },
  titleUnread: {
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 13,
  },
  amount: {
    fontWeight: "800",
    fontSize: 14,
  },
  rightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary ?? "#6C4CE6",
  },
  emptyWrap: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyText: { color: "#9CA3AF", fontWeight: "600" },
});