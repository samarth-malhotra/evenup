import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="[id]" options={{ title: "Friend's Transactions" }} />
    </Stack>
  );
}
