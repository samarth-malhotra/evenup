import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Groups' }} />
      <Stack.Screen name="new" options={{ title: 'Create Group' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Group details' }} />
      <Stack.Screen name="[id]/settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="[id]/settle-up" options={{ title: 'Settle up' }} />
      <Stack.Screen name="[id]/new-member" options={{ title: 'Add member' }} />
    </Stack>
  );
}
