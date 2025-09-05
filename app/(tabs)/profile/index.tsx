import Profile from '@/lib/profile/component/Profile';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';

function index() {
  return (
    <ThemedSafeArea scroll>
      <Profile />
    </ThemedSafeArea>
  );
}

export default index;
