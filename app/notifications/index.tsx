import ThemedSafeArea from "@/components/ThemedSafeArea";
import NotificationsScreen from "@/lib/notifications/components/notification";

function Notifications() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <NotificationsScreen />
    </ThemedSafeArea>
  );
}
export default Notifications;
