export type Activity = {
  id: string;
  title: string;
  subtitle?: string;
  amountText?: string;    // e.g., "₹ 250"
  createdAt: number;      // ms timestamp
  read: boolean;
  category?: "expense" | "settlement" | "group" | "system";
};