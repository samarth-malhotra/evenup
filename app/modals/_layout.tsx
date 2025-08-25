// app/modals/_layout.tsx
import { Stack } from "expo-router";
export default function ModalStack() {
  return (
    <Stack screenOptions={{ presentation: "modal" }}>
      <Stack.Screen name="invite" options={{ title: "Invite User" }} />
    </Stack>
  );
}
