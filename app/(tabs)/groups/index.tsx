import GroupList from "@/lib/groups/components/GroupList";
import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";

function index() {
  return (
    <ThemedSafeArea bg="bg" statusBarStyle="dark">
      <GroupList />
    </ThemedSafeArea>
  );
}

export default index;
