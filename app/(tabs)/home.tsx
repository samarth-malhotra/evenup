import HomeScreen from '@/lib/home/components/Home';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';

function Home() {
  return (
    <ThemedSafeArea bg="bg" statusBarStyle="dark" scroll>
      <HomeScreen />
    </ThemedSafeArea>
  );
}

export default Home;
