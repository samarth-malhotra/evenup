import AddBill from '@/lib/bills/components/AddBill';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
import WaveHeader from '@/lib/shared/components/WaveHeader';

export default function AddBillScreen() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={0}>
      <WaveHeader />
      <AddBill />
    </ThemedSafeArea>
  );
}
