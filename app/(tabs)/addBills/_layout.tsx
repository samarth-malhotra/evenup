// app/admin/_layout.tsx
import { Stack } from "expo-router";
export default function AdminStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Add Bills" }} />
    </Stack>
  );
}
