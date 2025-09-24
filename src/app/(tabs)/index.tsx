import ThemedSafeArea from '@/components/ThemedSafeArea';
import HomeScreen from '@/features/home/components/Home';

function index() {
  return (
    <ThemedSafeArea scroll>
      <HomeScreen />
    </ThemedSafeArea>
  );
}

export default index;
