import NotificationsScreen from "@/lib/notifications/components/Notification";
import ThemedSafeArea from "@/lib/shared/components/ThemedSafeArea";

function Notifications() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <NotificationsScreen />
    </ThemedSafeArea>
  );
}
export default Notifications;
