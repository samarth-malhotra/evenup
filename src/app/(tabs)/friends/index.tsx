import ThemedSafeArea from '@/components/ThemedSafeArea';
import FriendList from '@/features/friends/components/FriendList';

function FriendListScreen() {
  return (
    <ThemedSafeArea scroll>
      <FriendList />
    </ThemedSafeArea>
  );
}

export default FriendListScreen;
