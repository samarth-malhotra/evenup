import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import Summary from '@/lib/summary/components/summary';

export default function GroupsScreen() {
  return (
    <ThemedSafeArea scroll={false} padding={0}>
      <Summary />
    </ThemedSafeArea>
  );
}
