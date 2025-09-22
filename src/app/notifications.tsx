import ThemedSafeArea from '@/components/ThemedSafeArea';
import NotificationsScreen from '@/features/notifications/components/Notification';

function Notifications() {
  return (
    <ThemedSafeArea scroll={false} padding={0}>
      <NotificationsScreen />
    </ThemedSafeArea>
  );
}
export default Notifications;
