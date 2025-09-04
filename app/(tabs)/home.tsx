import HomeScreen from '@/lib/home/components/Home';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';

function Home() {
  return (
    <ThemedSafeArea scroll>
      <HomeScreen />
    </ThemedSafeArea>
  );
}

export default Home;
