import AddBill from "@/lib/bills/components/addBill";
import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";

export default function GroupsScreen() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <AddBill />
    </ThemedSafeArea>
  );
}
