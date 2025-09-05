import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import Summary from '@/lib/summary/components/Summary';

export default function SummaryScreen() {
  return (
    <ThemedSafeArea padding={0}>
      <Summary />
    </ThemedSafeArea>
  );
}
