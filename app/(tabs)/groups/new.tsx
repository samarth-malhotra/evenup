import NewGroup from '@/lib/groups/components/NewGroup';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';

function NewGroupLayout() {
  return (
    <ThemedSafeArea padding={16}>
      <NewGroup />
    </ThemedSafeArea>
  );
}

export default NewGroupLayout;
