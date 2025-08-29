import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";
import Summary from "@/lib/summary/components/Summary";

export default function GroupsScreen() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <Summary />
    </ThemedSafeArea>
  );
}
