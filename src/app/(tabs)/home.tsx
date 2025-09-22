import ThemedSafeArea from '@/components/ThemedSafeArea';
import HomeScreen from '@/features/home/components/Home';

function Home() {
  return (
    <ThemedSafeArea scroll>
      <HomeScreen />
    </ThemedSafeArea>
  );
}

export default Home;
