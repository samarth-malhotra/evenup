import AddBill from "@/lib/bills/components/AddBill";
import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";

export default function AddBillScreen() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <AddBill />
    </ThemedSafeArea>
  );
}
