import ThemedSafeArea from '@/components/ThemedSafeArea';
import Profile from '@/features/profile/component/Profile';

function index() {
  return (
    <ThemedSafeArea scroll>
      <Profile />
    </ThemedSafeArea>
  );
}

export default index;
