import { Stack } from "expo-router";

export default function GroupsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          title: "New Group",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
