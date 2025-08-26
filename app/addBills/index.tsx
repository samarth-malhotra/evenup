import ThemedSafeArea from "../../components/ThemedSafeArea";
import AddBill from "../../lib/bills/addBill";

export default function GroupsScreen() {

  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <AddBill />
    </ThemedSafeArea>
  );
}
