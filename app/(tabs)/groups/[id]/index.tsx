// import GroupDetail from "@/lib/groups/components/GroupDetail";
import GroupDetil from "@/lib/groups/components/GroupDetil";
import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";

function GroupDetailScreen() {
  return (
    <ThemedSafeArea bg="bg" statusBarStyle="dark">
      <GroupDetil />
    </ThemedSafeArea>
  );
}

export default GroupDetailScreen;
