import FriendList from '@/lib/friends/components/FriendList';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';

function FriendListScreen() {
  return (
    <ThemedSafeArea scroll>
      <FriendList />
    </ThemedSafeArea>
  );
}

export default FriendListScreen;
